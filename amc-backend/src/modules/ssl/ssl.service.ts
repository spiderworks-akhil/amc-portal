import { promises as dns } from 'dns';
import * as tls from 'tls';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import {
  CreateSslDto,
  UpdateSslDto,
  ListSslDto,
  SslSortBy,
  SortOrder,
} from './dto';

@Injectable()
export class SslService {
  private readonly logger = new Logger(SslService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  async create(dto: CreateSslDto) {
    // Resolve the common_name or the linked domain's FQDN to verify it exists
    const fqdnToCheck =
      dto.common_name ??
      (await this.getDomainFqdn(dto.domain_id));
    if (fqdnToCheck) {
      await this.verifyDomainExists(fqdnToCheck);
    }

    const cert = await this.db
      .insertInto('ssl_certificates')
      .values({
        domain_id: dto.domain_id,
        asset_id: dto.asset_id ?? null,
        issuer: dto.issuer ?? null,
        common_name: dto.common_name ?? null,
        sans: JSON.stringify(dto.sans ?? []),
        valid_from: dto.valid_from ? new Date(dto.valid_from) : null,
        valid_to: dto.valid_to ? new Date(dto.valid_to) : null,
        type: dto.type ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create an initial snapshot
    await this.createSnapshot(cert.id);

    return cert;
  }

  async list(dto: ListSslDto) {
    const {
      page = 1,
      limit = 50,
      search,
      domain_id,
      asset_id,
      type,
      valid_to_from,
      valid_to_to,
      sort_by = SslSortBy.VALID_TO,
      sort_order = SortOrder.ASC,
    } = dto;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('ssl_certificates')
      .innerJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
      .leftJoin('assets', 'assets.id', 'ssl_certificates.asset_id');

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) =>
        eb.or([
          eb('ssl_certificates.common_name', 'ilike', pattern),
          eb('ssl_certificates.issuer', 'ilike', pattern),
          eb('domains.fqdn', 'ilike', pattern),
        ]),
      );
    }

    if (domain_id) {
      query = query.where('ssl_certificates.domain_id', '=', domain_id);
    }

    if (asset_id) {
      query = query.where('ssl_certificates.asset_id', '=', asset_id);
    }

    if (type) {
      query = query.where('ssl_certificates.type', '=', type);
    }

    if (valid_to_from) {
      query = query.where('ssl_certificates.valid_to', '>=', new Date(valid_to_from));
    }

    if (valid_to_to) {
      query = query.where('ssl_certificates.valid_to', '<=', new Date(valid_to_to));
    }

    const allowedSortColumns: Record<string, string> = {
      [SslSortBy.COMMON_NAME]: 'ssl_certificates.common_name',
      [SslSortBy.ISSUER]: 'ssl_certificates.issuer',
      [SslSortBy.TYPE]: 'ssl_certificates.type',
      [SslSortBy.VALID_TO]: 'ssl_certificates.valid_to',
      [SslSortBy.CREATED_AT]: 'ssl_certificates.created_at',
    };

    const sortColumn = allowedSortColumns[sort_by] ?? 'ssl_certificates.valid_to';
    const order = sort_order === SortOrder.DESC ? sql`desc` : sql`asc`;

    const [{ total }, data] = await Promise.all([
      query
        .select(this.db.fn.countAll<number>().as('total'))
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      query
        .clearSelect()
        .select([
          'ssl_certificates.id',
          'ssl_certificates.domain_id',
          'ssl_certificates.asset_id',
          'ssl_certificates.issuer',
          'ssl_certificates.common_name',
          'ssl_certificates.sans',
          'ssl_certificates.valid_from',
          'ssl_certificates.valid_to',
          'ssl_certificates.type',
          'ssl_certificates.last_checked_at',
          'ssl_certificates.created_at',
          'ssl_certificates.updated_at',
          'domains.fqdn as domain_fqdn',
          'assets.name as asset_name',
        ])
        .orderBy(sql`${sql.raw(sortColumn)}`, order)
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    // Enrich with days-to-expiry
    const now = new Date();
    const enriched = data.map((c) => ({
      ...c,
      days_to_expiry: c.valid_to
        ? Math.ceil(
            (new Date(c.valid_to).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null,
    }));

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const cert = await this.db
      .selectFrom('ssl_certificates')
      .innerJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
      .leftJoin('assets', 'assets.id', 'ssl_certificates.asset_id')
      .selectAll('ssl_certificates')
      .select([
        'domains.fqdn as domain_fqdn',
        'domains.expiry_date as domain_expiry_date',
        'assets.name as asset_name',
      ])
      .where('ssl_certificates.id', '=', id)
      .executeTakeFirst();

    if (!cert) throw new NotFoundException(`SSL certificate ${id} not found`);

    // Fetch snapshots
    const snapshots = await this.db
      .selectFrom('ssl_snapshots')
      .selectAll()
      .where('ssl_id', '=', id)
      .orderBy('checked_at', 'desc')
      .limit(10)
      .execute();

    const now = new Date();
    const daysToExpiry = cert.valid_to
      ? Math.ceil(
          (new Date(cert.valid_to).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    return { ...cert, days_to_expiry: daysToExpiry, snapshots };
  }

  async update(id: string, dto: UpdateSslDto) {
    await this.checkExists(id);

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (dto.domain_id !== undefined) {
      // Verify the new domain's FQDN resolves
      const domainFqdn = await this.getDomainFqdn(dto.domain_id);
      if (domainFqdn) {
        await this.verifyDomainExists(domainFqdn);
      }
      updateData.domain_id = dto.domain_id;
    }
    if (dto.asset_id !== undefined) updateData.asset_id = dto.asset_id;
    if (dto.issuer !== undefined) updateData.issuer = dto.issuer;
    if (dto.common_name !== undefined) {
      await this.verifyDomainExists(dto.common_name);
      updateData.common_name = dto.common_name;
    }
    if (dto.sans !== undefined) updateData.sans = JSON.stringify(dto.sans);
    if (dto.valid_from !== undefined) updateData.valid_from = new Date(dto.valid_from);
    if (dto.valid_to !== undefined) updateData.valid_to = new Date(dto.valid_to);
    if (dto.type !== undefined) updateData.type = dto.type;

    return this.db
      .updateTable('ssl_certificates')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async remove(id: string) {
    await this.checkExists(id);

    // Delete related snapshots first
    await this.db
      .deleteFrom('ssl_snapshots')
      .where('ssl_id', '=', id)
      .execute();

    await this.db
      .deleteFrom('ssl_certificates')
      .where('id', '=', id)
      .execute();

    return { message: 'SSL certificate deleted successfully' };
  }

  // ── TLS Check ──

  async triggerCheck(id: string) {
    await this.checkExists(id);

    // Get the cert to determine which hostname to connect to
    const certRec = await this.db
      .selectFrom('ssl_certificates')
      .select(['common_name', 'domain_id'])
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

    // Determine hostname: use common_name if set, otherwise fall back to domain FQDN
    let hostname = certRec.common_name;
    if (!hostname) {
      hostname = await this.getDomainFqdn(certRec.domain_id);
    }

    // Connect over TLS and read the live certificate
    if (hostname) {
      try {
        const liveData = await this.lookupSslCertDetails(hostname);

        // Build update with only non-null live data
        const updateData: Record<string, unknown> = {
          last_checked_at: new Date(),
          updated_at: new Date(),
        };

        if (liveData.issuer !== null) updateData.issuer = liveData.issuer;
        if (liveData.common_name !== null) updateData.common_name = liveData.common_name;
        if (liveData.sans.length > 0) updateData.sans = JSON.stringify(liveData.sans);
        if (liveData.valid_from !== null) updateData.valid_from = new Date(liveData.valid_from);
        if (liveData.valid_to !== null) updateData.valid_to = new Date(liveData.valid_to);
        if (liveData.type !== null) updateData.type = liveData.type;

        await this.db
          .updateTable('ssl_certificates')
          .set(updateData)
          .where('id', '=', id)
          .execute();

        this.logger.log(
          `SSL check updated certificate ${id} from live TLS data for ${hostname}: ` +
          `issuer=${liveData.issuer ?? '—'}, ` +
          `${liveData.sans.length} SANs, ` +
          `valid_to=${liveData.valid_to ?? '—'}, ` +
          `type=${liveData.type ?? '—'}`,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `SSL check TLS lookup failed for certificate ${id} (${hostname}): ` +
          `${err instanceof Error ? err.message : err}`,
        );
        // Still update last_checked_at to record the attempt
        await this.db
          .updateTable('ssl_certificates')
          .set({ last_checked_at: new Date() })
          .where('id', '=', id)
          .execute();
      }
    } else {
      this.logger.warn(
        `SSL check skipped for certificate ${id} — no hostname or domain FQDN available`,
      );
      await this.db
        .updateTable('ssl_certificates')
        .set({ last_checked_at: new Date() })
        .where('id', '=', id)
        .execute();
    }

    // Record a snapshot with current (possibly updated) data
    const snapshot = await this.createSnapshot(id);

    return {
      message: 'SSL certificate check completed',
      snapshot,
    };
  }

  async listSnapshots(certId: string) {
    await this.checkExists(certId);

    return this.db
      .selectFrom('ssl_snapshots')
      .selectAll()
      .where('ssl_id', '=', certId)
      .orderBy('checked_at', 'desc')
      .execute();
  }

  // ── Expiry tracking ──

  async getExpiringCerts(days: number = 30) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    return this.db
      .selectFrom('ssl_certificates')
      .innerJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
      .leftJoin('assets', 'assets.id', 'ssl_certificates.asset_id')
      .select([
        'ssl_certificates.id',
        'ssl_certificates.common_name',
        'ssl_certificates.issuer',
        'ssl_certificates.valid_to',
        'ssl_certificates.type',
        'ssl_certificates.last_checked_at',
        'domains.fqdn as domain_fqdn',
        'assets.name as asset_name',
      ])
      .where('ssl_certificates.valid_to', '>=', now)
      .where('ssl_certificates.valid_to', '<=', threshold)
      .orderBy('ssl_certificates.valid_to', 'asc')
      .execute();
  }

  async getExpiryStats() {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const sixtyDays = new Date();
    sixtyDays.setDate(sixtyDays.getDate() + 60);
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const stats = await this.db
      .selectFrom('ssl_certificates')
      .select([
        this.db.fn.countAll<number>().as('total'),
        this.db.fn
          .countAll<number>()
          .filterWhere('valid_to', '<', now)
          .as('expired'),
        this.db.fn
          .countAll<number>()
          .filterWhere('valid_to', '>=', now)
          .filterWhere('valid_to', '<=', thirtyDays)
          .as('expiring_30_days'),
        this.db.fn
          .countAll<number>()
          .filterWhere('valid_to', '>', thirtyDays)
          .filterWhere('valid_to', '<=', sixtyDays)
          .as('expiring_60_days'),
        this.db.fn
          .countAll<number>()
          .filterWhere('valid_to', '>', sixtyDays)
          .filterWhere('valid_to', '<=', ninetyDays)
          .as('expiring_90_days'),
      ])
      .executeTakeFirst();

    return {
      total: Number(stats?.total ?? 0),
      expired: Number(stats?.expired ?? 0),
      expiring_30_days: Number(stats?.expiring_30_days ?? 0),
      expiring_60_days: Number(stats?.expiring_60_days ?? 0),
      expiring_90_days: Number(stats?.expiring_90_days ?? 0),
    };
  }

  // ── TLS Certificate Lookup ──

  /** Connect to a hostname via TLS and extract the live SSL certificate details */
  async lookupSslCertDetails(hostname: string) {
    if (!hostname || hostname.length < 3) {
      throw new BadRequestException('Hostname must be at least 3 characters');
    }

    this.logger.log(`Looking up SSL certificate for: ${hostname}`);

    return new Promise<{
      issuer: string | null
      common_name: string | null
      sans: string[]
      valid_from: string | null
      valid_to: string | null
      type: string | null
    }>((resolve, reject) => {
      const socket = tls.connect(
        {
          host: hostname,
          port: 443,
          servername: hostname,
          rejectUnauthorized: false,
          timeout: 15000,
        },
        () => {
          try {
            const cert = socket.getPeerCertificate();
            if (!cert || Object.keys(cert).length === 0) {
              socket.destroy();
              resolve({
                issuer: null,
                common_name: null,
                sans: [],
                valid_from: null,
                valid_to: null,
                type: null,
              });
              return;
            }

            // Extract common name from subject (can be string or string[])
            const cnRaw = cert.subject?.CN;
            const commonName = Array.isArray(cnRaw) ? cnRaw[0] : (cnRaw ?? null);

            // Extract issuer (organization name or common name)
            const issuerOrg = cert.issuer?.O;
            const issuerCn = cert.issuer?.CN;
            const issuer = typeof issuerOrg === 'string' ? issuerOrg
              : typeof issuerCn === 'string' ? issuerCn
              : Array.isArray(issuerCn) ? issuerCn[0]
              : null;

            // Extract SANs from the subjectaltname string
            let sans: string[] = [];
            if (cert.subjectaltname) {
              sans = cert.subjectaltname
                .split(',')
                .map((s: string) => s.trim().replace(/^DNS:\s*/i, ''))
                .filter(Boolean);
            }

            // Format dates (can be string or string[])
            const vfRaw = cert.valid_from;
            const vtRaw = cert.valid_to;
            const validFromStr = Array.isArray(vfRaw) ? vfRaw[0] : vfRaw;
            const validToStr = Array.isArray(vtRaw) ? vtRaw[0] : vtRaw;
            const validFrom = validFromStr
              ? new Date(validFromStr).toISOString().split('T')[0]
              : null;
            const validTo = validToStr
              ? new Date(validToStr).toISOString().split('T')[0]
              : null;

            // Detect SSL type
            let type: string | null = 'dv';
            if (
              (typeof commonName === 'string' && commonName.startsWith('*.')) ||
              sans.some((s) => s.startsWith('*.'))
            ) {
              type = 'wildcard';
            }

            socket.destroy();
            resolve({
              issuer,
              common_name: commonName,
              sans,
              valid_from: validFrom,
              valid_to: validTo,
              type,
            });
          } catch (err) {
            socket.destroy();
            reject(err);
          }
        },
      );

      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('TLS connection timed out'));
      });
    });
  }

  // ── Helpers ──

  private async verifyDomainExists(fqdn: string) {
    try {
      await dns.resolve(fqdn);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err as NodeJS.ErrnoException).code === 'ENOTFOUND'
      ) {
        throw new BadRequestException(
          `Domain "${fqdn}" does not resolve — please verify it exists and try again.`,
        );
      }
      this.logger.warn(
        `DNS lookup warning for ${fqdn}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async getDomainFqdn(domainId: string): Promise<string | null> {
    const domain = await this.db
      .selectFrom('domains')
      .select('fqdn')
      .where('id', '=', domainId)
      .executeTakeFirst();
    return domain?.fqdn ?? null;
  }

  private async createSnapshot(certId: string) {
    const cert = await this.db
      .selectFrom('ssl_certificates')
      .select(['issuer', 'valid_from', 'valid_to'])
      .where('id', '=', certId)
      .executeTakeFirst();

    if (!cert) return null;

    const snapshot = await this.db
      .insertInto('ssl_snapshots')
      .values({
        ssl_id: certId,
        issuer: cert.issuer,
        valid_from: cert.valid_from,
        valid_to: cert.valid_to,
      })
      .returningAll()
      .executeTakeFirst();

    return snapshot;
  }

  private async checkExists(id: string) {
    const cert = await this.db
      .selectFrom('ssl_certificates')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();

    if (!cert) throw new NotFoundException(`SSL certificate ${id} not found`);
    return cert;
  }
}
