import { promises as dns } from 'dns';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SslService } from '../ssl/ssl.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ProviderType } from '../../db/types/enums';
import * as rdap from 'node-rdap';
import * as whoiser from 'whoiser';
import { getDomain } from 'tldts';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql, Transaction } from 'kysely';
import { DB } from '../../db/types.generated';
import { QueueService } from '../../queue/queue.service';
import {
  CreateDomainDto,
  UpdateDomainDto,
  ListDomainsDto,
  DomainSortBy,
  SortOrder,
  DomainStatusFilter,
} from './dto';

@Injectable()
export class DomainService {
  private readonly logger = new Logger(DomainService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly sslService: SslService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * Clean a raw FQDN input by stripping protocol, path, trailing dot, etc.
   * This protects against users accidentally pasting full URLs.
   */
  private cleanFqdn(raw: string): string {
    let cleaned = raw.trim().toLowerCase();
    // Strip protocol
    cleaned = cleaned.replace(/^https?:\/\//, '');
      // Strip path, query string, fragment
    cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
    // Strip trailing dot(s)
    cleaned = cleaned.replace(/\.+$/, '');
    return cleaned;
  }

  /**
   * Extract the registrable domain (apex) from an FQDN.
   * e.g. "campaign.ayurbethaniya.org" → "ayurbethaniya.org"
   * Returns the cleaned FQDN itself if extraction fails.
   */
  private extractRegistrableDomain(fqdn: string): string {
    const cleaned = this.cleanFqdn(fqdn);
    const domain = getDomain(cleaned, { mixedInputs: true });
    return domain ?? cleaned;
  }

  async create(dto: CreateDomainDto, createdBy?: string) {
    const cleanedFqdn = this.cleanFqdn(dto.fqdn);
    await this.verifyDomainExists(cleanedFqdn);

    // Use cleaned fqdn for the rest of the create flow
    dto.fqdn = cleanedFqdn;

    const result = await this.db.transaction().execute(async (trx) => {
      const domain = await trx
        .insertInto('domains')
        .values({
          asset_id: dto.asset_id,
          fqdn: dto.fqdn,
          registrar_id: dto.registrar_id ?? null,
          registered_date: dto.registered_date
            ? new Date(dto.registered_date)
            : null,
          expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : null,
          auto_renew: dto.auto_renew ?? false,
          nameservers: JSON.stringify(dto.nameservers ?? []),
          notes: dto.notes ?? null,
          created_by_id: createdBy ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await this.createSnapshot(domain.id, trx);

      const ssl = await trx
        .insertInto('ssl_certificates')
        .values({
          domain_id: domain.id,
          asset_id: dto.asset_id,
          common_name: domain.fqdn,
          issuer: null,
          sans: JSON.stringify([]),
          valid_from: null,
          valid_to: null,
          type: null,
          created_by_id: createdBy ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      this.logger.log('SSl ', ssl);
      return { domain, ssl };
    });

    this.logger.log('Transaction completed', result.ssl);

    // Fire-and-forget background TLS lookup to enrich the SSL certificate
    this.sslService.triggerCheck(result.ssl.id).catch((err) => {
      this.logger.error(
        `Background SSL TLS lookup failed for certificate ${result.ssl.id} (${result.domain.fqdn}): ${err instanceof Error ? err.message : err}`,
      );
    });

    // Fire-and-forget background registrar enrichment if not provided
    if (!dto.registrar_id) {
      this.detectAndLinkRegistrar(result.domain.id, result.domain.fqdn).catch(
        (err) => {
          this.logger.error(
            `Background registrar lookup failed for domain ${result.domain.id} (${result.domain.fqdn}): ${err instanceof Error ? err.message : err}`,
          );
        },
      );
    }

    try {
      await this.queueService.scheduleDomainRefresh(
        result.domain.id,
        this.configService.get('DOMAIN_REFRESH_CRON', '0 */6 * * *'),
      );
    } catch (err) {
      this.logger.error(
        `Failed to schedule refresh for domain ${result.domain.id}`,
        err instanceof Error ? err.stack : undefined,
      );
    }

    this.whatsappService.sendDomainCreated(result.domain as unknown as Record<string, unknown>).catch(
      (err) => {
        this.logger.error(
          `WhatsApp notification failed for domain ${result.domain.id}: ${err instanceof Error ? err.message : err}`,
        );
      },
    );

    return result.domain;
  }

  async list(dto: ListDomainsDto) {
    const {
      page = 1,
      limit = 50,
      search,
      asset_id,
      client_id,
      registrar_id,
      expiry_date_from,
      expiry_date_to,
      auto_renew,
      sort_by = DomainSortBy.EXPIRY_DATE,
      sort_order = SortOrder.ASC,
      status,
    } = dto;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('domains')
      .innerJoin('assets', 'assets.id', 'domains.asset_id')
      .leftJoin(
        'service_providers',
        'service_providers.id',
        'domains.registrar_id',
      );

    if (client_id) {
      query = query.where('assets.client_id', '=', client_id);
    }

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) =>
        eb.or([
          eb('domains.fqdn', 'ilike', pattern),
          eb('assets.name', 'ilike', pattern),
        ]),
      );
    }

    if (asset_id) {
      query = query.where('domains.asset_id', '=', asset_id);
    }

    if (registrar_id) {
      query = query.where('domains.registrar_id', '=', registrar_id);
    }

    if (expiry_date_from) {
      query = query.where(
        'domains.expiry_date',
        '>=',
        new Date(expiry_date_from),
      );
    }

    if (expiry_date_to) {
      query = query.where(
        'domains.expiry_date',
        '<=',
        new Date(expiry_date_to),
      );
    }

    if (auto_renew !== undefined) {
      query = query.where('domains.auto_renew', '=', auto_renew);
    }

    // Status filter
    if (status && status !== DomainStatusFilter.ALL) {
      const now = new Date();
      if (status === DomainStatusFilter.EXPIRED) {
        query = query.where('domains.expiry_date', '<', now);
      } else if (status === DomainStatusFilter.EXPIRING_SOON) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + 30);
        query = query
          .where('domains.expiry_date', '>', now)
          .where('domains.expiry_date', '<=', threshold);
      } else if (status === DomainStatusFilter.ACTIVE) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + 30);
        query = query.where('domains.expiry_date', '>', threshold);
      }
    }

    // Sorting
    const allowedSortColumns: Record<string, string> = {
      [DomainSortBy.FQDN]: 'domains.fqdn',
      [DomainSortBy.ASSET_NAME]: 'assets.name',
      [DomainSortBy.EXPIRY_DATE]: 'domains.expiry_date',
      [DomainSortBy.REGISTERED_DATE]: 'domains.registered_date',
      [DomainSortBy.AUTO_RENEW]: 'domains.auto_renew',
      [DomainSortBy.CREATED_AT]: 'domains.created_at',
      [DomainSortBy.UPDATED_AT]: 'domains.updated_at',
    };

    const sortColumn = allowedSortColumns[sort_by] ?? 'domains.expiry_date';
    const order = sort_order === SortOrder.DESC ? sql`desc` : sql`asc`;

    // ── Run count + data in parallel ──
    const [{ total }, data] = await Promise.all([
      query
        .select(this.db.fn.countAll<number>().as('total'))
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      query
        .clearSelect()
        .select([
          'domains.id',
          'domains.asset_id',
          'domains.fqdn',
          'domains.registrar_id',
          'domains.registered_date',
          'domains.expiry_date',
          'domains.auto_renew',
          'domains.nameservers',
          'domains.notes',
          'domains.last_checked_at',
          'domains.created_at',
          'domains.updated_at',
          'assets.name as asset_name',
          'service_providers.name as registrar_name',
        ])
        .orderBy(sql`${sql.raw(sortColumn)}`, order)
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    // Enrich with days-to-expiry and SSL count in batch
    let enriched = data;
    if (data.length > 0) {
      const domainIds = data.map((d) => d.id);
      const now = new Date();

      const sslCounts = await this.db
        .selectFrom('ssl_certificates')
        .select([
          'ssl_certificates.domain_id',
          this.db.fn.countAll<number>().as('ssl_count'),
        ])
        .where('ssl_certificates.domain_id', 'in', domainIds)
        .groupBy('ssl_certificates.domain_id')
        .execute();

      const sslCountMap = new Map(
        sslCounts.map((row) => [row.domain_id, Number(row.ssl_count ?? 0)]),
      );

      enriched = data.map((d) => ({
        ...d,
        ssl_count: sslCountMap.get(d.id) ?? 0,
        days_to_expiry: d.expiry_date
          ? Math.ceil(
              (new Date(d.expiry_date).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      }));
    }

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const domain = await this.db
      .selectFrom('domains')
      .innerJoin('assets', 'assets.id', 'domains.asset_id')
      .leftJoin(
        'service_providers',
        'service_providers.id',
        'domains.registrar_id',
      )
      .selectAll('domains')
      .select([
        'assets.name as asset_name',
        'assets.client_id as asset_client_id',
        'service_providers.name as registrar_name',
        'service_providers.website as registrar_website',
      ])
      .where('domains.id', '=', id)
      .executeTakeFirst();

    if (!domain) throw new NotFoundException(`Domain ${id} not found`);

    // Fetch SSL certificates for this domain
    const sslCertificates = await this.db
      .selectFrom('ssl_certificates')
      .selectAll()
      .where('ssl_certificates.domain_id', '=', id)
      .orderBy('ssl_certificates.last_checked_at', 'desc')
      .execute();

    // Fetch recent snapshots
    const snapshots = await this.db
      .selectFrom('domain_snapshots')
      .selectAll()
      .where('domain_snapshots.domain_id', '=', id)
      .orderBy('domain_snapshots.checked_at', 'desc')
      .limit(10)
      .execute();

    // Compute days-to-expiry
    const now = new Date();
    const daysToExpiry = domain.expiry_date
      ? Math.ceil(
          (new Date(domain.expiry_date).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    return {
      ...domain,
      days_to_expiry: daysToExpiry,
      sslCertificates,
      snapshots,
    };
  }

  async update(id: string, dto: UpdateDomainDto) {
    await this.checkExists(id);

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (dto.asset_id !== undefined) updateData.asset_id = dto.asset_id;
    if (dto.fqdn !== undefined) {
      const cleanedFqdn = this.cleanFqdn(dto.fqdn);
      await this.verifyDomainExists(cleanedFqdn);
      updateData.fqdn = cleanedFqdn;
    }
    if (dto.registrar_id !== undefined)
      updateData.registrar_id = dto.registrar_id;
    if (dto.registered_date !== undefined)
      updateData.registered_date = new Date(dto.registered_date);
    if (dto.expiry_date !== undefined)
      updateData.expiry_date = new Date(dto.expiry_date);
    if (dto.auto_renew !== undefined) updateData.auto_renew = dto.auto_renew;
    if (dto.nameservers !== undefined)
      updateData.nameservers = JSON.stringify(dto.nameservers);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const domain = await this.db
      .updateTable('domains')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return domain;
  }

  async remove(id: string) {
    await this.checkExists(id);

    // Delete related snapshots first
    await this.db
      .deleteFrom('domain_snapshots')
      .where('domain_id', '=', id)
      .execute();

    // Remove scheduled cron job
    await this.queueService.removeScheduledDomainRefresh(id);

    await this.db.deleteFrom('domains').where('id', '=', id).execute();

    return { message: 'Domain deleted successfully' };
  }

  // ── WHOIS / Check / Refresh ──

  /** Full live refresh: RDAP/WHOIS lookup → update domain record → snapshot */
  async refreshDomain(id: string) {
    const domain = await this.checkExists(id);

    try {
      const live = await this.lookupDomainDetails(domain.fqdn);

      const updateData: Record<string, unknown> = {
        last_checked_at: new Date(),
        updated_at: new Date(),
      };

      if (live.registered_date)
        updateData.registered_date = new Date(live.registered_date);
      if (live.expiry_date) updateData.expiry_date = new Date(live.expiry_date);
      if (live.registrar_id) updateData.registrar_id = live.registrar_id;
      if (live.nameservers.length > 0)
        updateData.nameservers = JSON.stringify(live.nameservers);

      await this.db
        .updateTable('domains')
        .set(updateData)
        .where('id', '=', id)
        .execute();

      this.logger.log(
        `Domain refresh succeeded for ${domain.fqdn}: ` +
          `expiry=${live.expiry_date ?? '—'}, registrar=${live.registrar ?? '—'}, ` +
          `${live.nameservers.length} nameservers`,
      );
    } catch (err: unknown) {
      this.logger.warn(
        `Domain refresh lookup failed for ${domain.fqdn} (${id}): ` +
          `${err instanceof Error ? err.message : err}`,
      );
      // Still record the attempt
      await this.db
        .updateTable('domains')
        .set({ last_checked_at: new Date() })
        .where('id', '=', id)
        .execute();
    }

    const snapshot = await this.createSnapshot(id);
    return { message: 'Domain refresh completed', snapshot };
  }

  async triggerCheck(id: string) {
    const result = await this.refreshDomain(id);
    return { message: 'Domain check completed', snapshot: result.snapshot };
  }

  async listSnapshots(domainId: string) {
    await this.checkExists(domainId);

    return this.db
      .selectFrom('domain_snapshots')
      .selectAll()
      .where('domain_id', '=', domainId)
      .orderBy('checked_at', 'desc')
      .execute();
  }

  // ── Expiry tracking ──

  async getExpiringDomains(days: number = 30, managerId?: string) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    let query = this.db
      .selectFrom('domains')
      .innerJoin('assets', 'assets.id', 'domains.asset_id')
      .innerJoin('clients', 'clients.id', 'assets.client_id')
      .select([
        'domains.id',
        'domains.fqdn',
        'domains.expiry_date',
        'domains.auto_renew',
        'domains.last_checked_at',
        'assets.name as asset_name',
        'assets.client_id as client_id',
        'clients.name as client_name',
        'clients.email as client_email',
      ])
      .where('domains.expiry_date', 'is not', null)
      .where('domains.expiry_date', '<=', threshold);

    // If manager_id provided, filter to only clients assigned to this manager
    if (managerId) {
      const managedClientIds = await this.db
        .selectFrom('client_account_managers')
        .select('client_id')
        .where('manager_id', '=', managerId)
        .where('deleted_at', 'is', null)
        .execute()
        .then((rows) => rows.map((r) => r.client_id));

      if (managedClientIds.length > 0) {
        query = query.where('assets.client_id', 'in', managedClientIds);
      } else {
        // Manager has no assigned clients — return empty
        return [];
      }
    }

    return query.orderBy('domains.expiry_date', 'asc').execute();
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
      .selectFrom('domains')
      .select([
        this.db.fn.countAll<number>().as('total'),
        this.db.fn
          .countAll<number>()
          .filterWhere('expiry_date', '<', now)
          .as('expired'),
        this.db.fn
          .countAll<number>()
          .filterWhere('expiry_date', '>=', now)
          .filterWhere('expiry_date', '<=', thirtyDays)
          .as('expiring_30_days'),
        this.db.fn
          .countAll<number>()
          .filterWhere('expiry_date', '>', thirtyDays)
          .filterWhere('expiry_date', '<=', sixtyDays)
          .as('expiring_60_days'),
        this.db.fn
          .countAll<number>()
          .filterWhere('expiry_date', '>', sixtyDays)
          .filterWhere('expiry_date', '<=', ninetyDays)
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

  // ── Helpers ──

  /** Exposed for frontend DNS verification endpoint — validates domain exists */
  async verifyFqdn(fqdn: string) {
    await this.verifyDomainExists(this.cleanFqdn(fqdn));
  }

  /** Extract a date string (yyyy-MM-dd) from a variety of WHOIS date formats */
  private normalizeWhoisDate(raw: string): string | undefined {
    if (!raw) return undefined;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    // Try parsing common WHOIS date formats like "14-sep-2028" or "2028-09-14T00:00:00Z"
    const cleaned = raw.replace(
      /(\d{1,2})\-([a-z]{3})\-(\d{4})/i,
      (_, d, m, y) => {
        const months: Record<string, string> = {
          jan: '01',
          feb: '02',
          mar: '03',
          apr: '04',
          may: '05',
          jun: '06',
          jul: '07',
          aug: '08',
          sep: '09',
          oct: '10',
          nov: '11',
          dec: '12',
        };
        return `${y}-${months[m.toLowerCase()] || '01'}-${d.padStart(2, '0')}`;
      },
    );
    if (cleaned !== raw) {
      const d2 = new Date(cleaned);
      if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0];
    }
    return undefined;
  }

  /** Attempt RDAP lookup using node-rdap */
  private async lookupRdap(fqdn: string) {
    const result = await rdap.domain(fqdn);

    let registeredDate: string | undefined;
    let expiryDate: string | undefined;
    let registrar: string | undefined;

    // Extract events (registration, expiration)
    const events = (
      result as { events?: Array<{ eventAction: string; eventDate: string }> }
    ).events;
    if (events) {
      for (const event of events) {
        const dateStr = event.eventDate?.split('T')[0];
        if (event.eventAction === 'registration' && dateStr) {
          registeredDate = dateStr;
        } else if (event.eventAction === 'expiration' && dateStr) {
          expiryDate = dateStr;
        }
      }
    }

    // Extract registrar name from entities → vcard
    const entities = (
      result as {
        entities?: Array<{
          vcardArray?: [string, Array<[string, unknown, string, string]>];
        }>;
      }
    ).entities;
    if (entities) {
      for (const entity of entities) {
        const vcard = entity.vcardArray?.[1];
        if (!vcard) continue;
        for (const field of vcard) {
          if (field[0] === 'fn' && field[3]) {
            registrar = field[3] as string;
            break;
          }
        }
        if (registrar) break;
      }
    }

    // Extract nameservers
    const nsEntries = (result as { nameservers?: Array<{ ldhName: string }> })
      .nameservers;
    const nameservers = nsEntries
      ? nsEntries.map((ns) => ns.ldhName).filter(Boolean)
      : [];

    return { registeredDate, expiryDate, registrar, nameservers };
  }

  /** Fallback WHOIS lookup using whoiser package */
  private async lookupWhois(fqdn: string) {
    const raw = await whoiser.whoisDomain(fqdn);
    const first = await whoiser.firstResult(raw);

    if (!first || typeof first !== 'object') {
      return {
        registeredDate: undefined,
        expiryDate: undefined,
        registrar: undefined,
        nameservers: [] as string[],
      };
    }

    const record = first as Record<string, string | string[]>;

    const registrar =
      typeof record.Registrar === 'string' ? record.Registrar : undefined;

    const registeredDate = this.normalizeWhoisDate(
      typeof record['Created Date'] === 'string' ? record['Created Date'] : '',
    );

    const expiryDate = this.normalizeWhoisDate(
      typeof record['Expiry Date'] === 'string' ? record['Expiry Date'] : '',
    );

    // Name Server can be a string with multiple values separated by spaces/newlines
    let nameservers: string[] = [];
    const ns = record['Name Server'];
    if (Array.isArray(ns)) {
      nameservers = ns.filter(Boolean);
    } else if (typeof ns === 'string') {
      nameservers = ns
        .split(/[\s,]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0 && s.includes('.'));
    }
    this.logger.log('Registrar:', registrar);
    return { registeredDate, expiryDate, registrar, nameservers };
  }

  /** Try to match a registrar name to a provider in the database */
  private async matchRegistrarToProvider(
    registrarName: string,
  ): Promise<string | undefined> {
    if (!registrarName) return undefined;

    const normalized = registrarName.toLowerCase().trim();

    // 1. Exact match
    const exact = await this.db
      .selectFrom('service_providers')
      .select('id')
      .where('type', '=', 'registrar')
      .where(sql`LOWER(name)`, '=', normalized)
      .executeTakeFirst();
    if (exact) return exact.id;

    // 2. Provider name is a substring of the registrar name (e.g. "MarkMonitor" in "MarkMonitor Inc.")
    //    Uses ILIKE for case-insensitive matching
    const allRegistrars = await this.db
      .selectFrom('service_providers')
      .select(['id', 'name'])
      .where('type', '=', 'registrar')
      .execute();

    // Check if any provider name is contained within the RDAP registrar name
    for (const p of allRegistrars) {
      if (normalized.includes(p.name.toLowerCase())) {
        return p.id;
      }
    }

    // 3. RDAP registrar name is contained within a provider name
    for (const p of allRegistrars) {
      if (p.name.toLowerCase().includes(normalized)) {
        return p.id;
      }
    }

    // 4. Match by first word
    const firstWord = normalized.split(/[\s,]+/)[0];
    if (firstWord) {
      for (const p of allRegistrars) {
        if (p.name.toLowerCase().startsWith(firstWord)) {
          return p.id;
        }
      }
    }

    // 5. No match found — auto-create a new provider record
    this.logger.log(
      `Auto-creating registrar provider from RDAP/WHOIS data: "${registrarName}"`,
    );
    const created = await this.db
      .insertInto('service_providers')
      .values({
        name: registrarName.trim(),
        type: ProviderType.REGISTRAR,
        website: null,
        notes: null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return created.id;
  }

  /** Look up a domain via RDAP → WHOIS → DNS fallback chain */
  async lookupDomainDetails(fqdn: string) {
    const cleanedFqdn = this.cleanFqdn(fqdn);
    await this.verifyDomainExists(cleanedFqdn);

    // RDAP/WHOIS only work on registrable domains (apex), not subdomains
    const registrableDomain = this.extractRegistrableDomain(cleanedFqdn);

    let registeredDate: string | undefined;
    let expiryDate: string | undefined;
    let registrar: string | undefined;
    let nameservers: string[] = [];

    // 1. Try RDAP (node-rdap handles TLD-specific bootstrapping)
    try {
      const rdapResult = await this.lookupRdap(registrableDomain);
      registeredDate = rdapResult.registeredDate;
      expiryDate = rdapResult.expiryDate;
      registrar = rdapResult.registrar;
      nameservers = rdapResult.nameservers;

      this.logger.log(
        `RDAP lookup succeeded for ${registrableDomain} (from ${cleanedFqdn}): registered=${registeredDate ?? '—'}, ` +
          `expiry=${expiryDate ?? '—'}, registrar=${registrar ?? '—'}, ` +
          `${nameservers.length} nameservers`,
      );
    } catch (rdapErr: unknown) {
      this.logger.warn(
        `RDAP lookup failed for ${registrableDomain} (from ${cleanedFqdn}): ${rdapErr instanceof Error ? rdapErr.message : rdapErr}`,
      );

      // 2. Fallback: WHOIS via whoiser
      try {
        const whoisResult = await this.lookupWhois(registrableDomain);
        registeredDate = whoisResult.registeredDate;
        expiryDate = whoisResult.expiryDate;
        registrar = whoisResult.registrar;
        nameservers = whoisResult.nameservers;

        this.logger.log(
          `WHOIS fallback succeeded for ${registrableDomain} (from ${cleanedFqdn}): registered=${registeredDate ?? '—'}, ` +
            `expiry=${expiryDate ?? '—'}, registrar=${registrar ?? '—'}, ` +
            `${nameservers.length} nameservers`,
        );
      } catch (whoisErr: unknown) {
        this.logger.warn(
          `WHOIS fallback also failed for ${registrableDomain} (from ${cleanedFqdn}): ${whoisErr instanceof Error ? whoisErr.message : whoisErr}`,
        );

        // 3. Final fallback: DNS NS resolution
        try {
          nameservers = await dns.resolveNs(cleanedFqdn);
          this.logger.log(`Fallback DNS NS resolution succeeded for ${cleanedFqdn}`);
        } catch {
          // NS records are optional
        }
      }
    }

    // Match the registrar name to a provider ID in our database
    const registrarId = registrar
      ? await this.matchRegistrarToProvider(registrar)
      : undefined;

    return {
      valid: true,
      fqdn: cleanedFqdn,
      nameservers,
      registered_date: registeredDate,
      expiry_date: expiryDate,
      registrar,
      registrar_id: registrarId,
    };
  }

  private async verifyDomainExists(fqdn: string) {
    try {
      await dns.resolve(fqdn);
      this.logger.log(`Verified domain ${fqdn}`);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err as NodeJS.ErrnoException).code === 'ENOTFOUND'
      ) {
        throw new BadRequestException(
          `Domain "${fqdn}" does not resolve — please verify it exists and try again.`,
        );
      }
      // For other DNS errors (timeouts, network issues), log and allow through
      this.logger.warn(
        `DNS lookup warning for ${fqdn}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async createSnapshot(domainId: string, trx?: Transaction<DB>) {
    const db = trx ?? this.db;

    const domainRow = await db
      .selectFrom('domains')
      .select(['fqdn', 'expiry_date', 'registrar_id', 'nameservers'])
      .where('id', '=', domainId)
      .executeTakeFirst();

    if (!domainRow) return null;

    // Get registrar name if linked
    let registrarName: string | null = null;
    if (domainRow.registrar_id) {
      const provider = await db
        .selectFrom('service_providers')
        .select('name')
        .where('id', '=', domainRow.registrar_id)
        .executeTakeFirst();
      registrarName = provider?.name ?? null;
    }

    const snapshot = await db
      .insertInto('domain_snapshots')
      .values({
        domain_id: domainId,
        registrar: registrarName,
        expiry_date: domainRow.expiry_date,
        nameservers: JSON.stringify(domainRow.nameservers ?? []),
      })
      .returningAll()
      .executeTakeFirst();

    return snapshot;
  }

  /** Try RDAP → WHOIS to detect a domain's registrar and link it */
  private async detectAndLinkRegistrar(domainId: string, fqdn: string) {
    const registrableDomain = this.extractRegistrableDomain(fqdn);
    let registrarName: string | undefined;

    // 1. Try RDAP
    try {
      const rdapResult = await this.lookupRdap(registrableDomain);
      registrarName = rdapResult.registrar;
    } catch {
      // 2. Fallback to WHOIS
      try {
        const whoisResult = await this.lookupWhois(registrableDomain);
        registrarName = whoisResult.registrar;
      } catch {
        // Both failed — nothing to enrich
      }
    }

    if (!registrarName) return;

    const registrarId = await this.matchRegistrarToProvider(registrarName);
    if (!registrarId) return;

    await this.db
      .updateTable('domains')
      .set({ registrar_id: registrarId, updated_at: new Date() })
      .where('id', '=', domainId)
      .execute();

    this.logger.log(
      `Background registrar enrichment for ${fqdn}: matched to provider ${registrarId}`,
    );
  }

  private async checkExists(id: string) {
    const domain = await this.db
      .selectFrom('domains')
      .selectAll('domains')
      .where('id', '=', id)
      .executeTakeFirst();

    if (!domain) throw new NotFoundException(`Domain ${id} not found`);
    return domain;
  }
}
