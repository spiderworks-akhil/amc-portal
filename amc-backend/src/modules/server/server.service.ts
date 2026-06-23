import { promises as dns } from 'dns';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import * as rdap from 'node-rdap';
import { DB } from '../../db/types.generated';
import {
  CreateServerDto,
  UpdateServerDto,
  ListServersDto,
  ServerSortBy,
  SortOrder,
  AssetIdsDto,
} from './dto';
import { ProviderType } from 'src/db/types/enums';

@Injectable()
export class ServerService {
  private readonly logger = new Logger(ServerService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  /**
   * Normalize a panel URL by ensuring a protocol is present.
   * Users often enter bare hostnames like "panel.example.com" without https://.
   */
  private normalizePanelUrl(raw: string | undefined): string | null {
    if (!raw) return null;
    let cleaned = raw.trim();
    if (!cleaned) return null;
    // Add https:// if no protocol is present
    if (!/^https?:\/\//i.test(cleaned)) {
      cleaned = 'https://' + cleaned;
    }
    // Strip trailing slash for consistency
    cleaned = cleaned.replace(/\/+$/, '');
    return cleaned;
  }

  async create(dto: CreateServerDto, createdBy?: string) {
    return this.db
      .insertInto('servers')
      .values({
        provider_id: dto.provider_id,
        label: dto.label,
        ip_addresses: JSON.stringify(dto.ip_addresses ?? []),
        region: dto.region ?? null,
        operating_system: dto.operating_system ?? null,
        panel_url: this.normalizePanelUrl(dto.panel_url),
        monthly_cost: dto.monthly_cost !== undefined ? String(dto.monthly_cost) : null,
        currency: dto.currency ?? 'USD',
        renewal_date: dto.renewal_date ? new Date(dto.renewal_date) : null,
        notes: dto.notes ?? null,
        created_by_id: createdBy ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async list(dto: ListServersDto) {
    const {
      page = 1,
      limit = 50,
      search,
      provider_id,
      region,
      renewal_date_from,
      renewal_date_to,
      sort_by = ServerSortBy.LABEL,
      sort_order = SortOrder.ASC,
    } = dto;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('servers')
      .innerJoin('service_providers', 'service_providers.id', 'servers.provider_id');

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) =>
        eb.or([
          eb('servers.label', 'ilike', pattern),
          eb('servers.region', 'ilike', pattern),
          eb('servers.operating_system', 'ilike', pattern),
          eb('service_providers.name', 'ilike', pattern),
        ]),
      );
    }

    if (provider_id) {
      query = query.where('servers.provider_id', '=', provider_id);
    }

    if (region) {
      query = query.where('servers.region', '=', region);
    }

    if (renewal_date_from) {
      query = query.where('servers.renewal_date', '>=', new Date(renewal_date_from));
    }

    if (renewal_date_to) {
      query = query.where('servers.renewal_date', '<=', new Date(renewal_date_to));
    }

    const allowedSortColumns: Record<string, string> = {
      [ServerSortBy.LABEL]: 'servers.label',
      [ServerSortBy.PROVIDER_NAME]: 'service_providers.name',
      [ServerSortBy.REGION]: 'servers.region',
      [ServerSortBy.MONTHLY_COST]: 'servers.monthly_cost',
      [ServerSortBy.RENEWAL_DATE]: 'servers.renewal_date',
      [ServerSortBy.CREATED_AT]: 'servers.created_at',
    };

    const sortColumn = allowedSortColumns[sort_by] ?? 'servers.label';
    const order = sort_order === SortOrder.DESC ? sql`desc` : sql`asc`;

    const [{ total }, data] = await Promise.all([
      query
        .select(this.db.fn.countAll<number>().as('total'))
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      query
        .clearSelect()
        .select([
          'servers.id',
          'servers.provider_id',
          'servers.label',
          'servers.ip_addresses',
          'servers.region',
          'servers.operating_system',
          'servers.panel_url',
          'servers.monthly_cost',
          'servers.currency',
          'servers.renewal_date',
          'servers.notes',
          'servers.created_at',
          'servers.updated_at',
          'service_providers.name as provider_name',
          'service_providers.type as provider_type',
        ])
        .orderBy(sql`${sql.raw(sortColumn)}`, order)
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    // Enrich with asset count in batch
    let enriched = data;
    if (data.length > 0) {
      const serverIds = data.map((s) => s.id);

      const assetCounts = await this.db
        .selectFrom('asset_servers')
        .select([
          'asset_servers.server_id',
          this.db.fn.countAll<number>().as('asset_count'),
        ])
        .where('asset_servers.server_id', 'in', serverIds)
        .groupBy('asset_servers.server_id')
        .execute();

      const assetCountMap = new Map(
        assetCounts.map((r) => [r.server_id, Number(r.asset_count ?? 0)]),
      );

      enriched = data.map((s) => ({
        ...s,
        asset_count: assetCountMap.get(s.id) ?? 0,
      }));
    }

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const server = await this.db
      .selectFrom('servers')
      .innerJoin('service_providers', 'service_providers.id', 'servers.provider_id')
      .selectAll('servers')
      .select([
        'service_providers.name as provider_name',
        'service_providers.type as provider_type',
        'service_providers.website as provider_website',
      ])
      .where('servers.id', '=', id)
      .executeTakeFirst();

    if (!server) throw new NotFoundException(`Server ${id} not found`);

    // Fetch linked assets
    const assets = await this.db
      .selectFrom('asset_servers')
      .innerJoin('assets', 'assets.id', 'asset_servers.asset_id')
      .select([
        'assets.id',
        'assets.name',
        'assets.status',
        'assets.type as type_name',
      ])
      .where('asset_servers.server_id', '=', id)
      .where('assets.deleted_at', 'is', null)
      .execute();

    return { ...server, assets };
  }

  async update(id: string, dto: UpdateServerDto) {
    await this.checkExists(id);

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (dto.provider_id !== undefined) updateData.provider_id = dto.provider_id;
    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.ip_addresses !== undefined) updateData.ip_addresses = JSON.stringify(dto.ip_addresses);
    if (dto.region !== undefined) updateData.region = dto.region;
    if (dto.operating_system !== undefined) updateData.operating_system = dto.operating_system;
    if (dto.panel_url !== undefined) updateData.panel_url = this.normalizePanelUrl(dto.panel_url);
    if (dto.monthly_cost !== undefined) updateData.monthly_cost = String(dto.monthly_cost);
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.renewal_date !== undefined) updateData.renewal_date = new Date(dto.renewal_date);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.db
      .updateTable('servers')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async remove(id: string) {
    await this.checkExists(id);

    // Unlink all assets first
    await this.db
      .deleteFrom('asset_servers')
      .where('server_id', '=', id)
      .execute();

    await this.db
      .deleteFrom('servers')
      .where('id', '=', id)
      .execute();

    return { message: 'Server deleted successfully' };
  }

  // ── Asset linking ──

  async addAssets(serverId: string, dto: AssetIdsDto) {
    await this.checkExists(serverId);

    const rows = dto.asset_ids.map((asset_id) => ({
      server_id: serverId,
      asset_id,
    }));

    const result = await this.db
      .insertInto('asset_servers')
      .values(rows)
      .onConflict((oc) =>
        oc.columns(['server_id', 'asset_id']).doNothing(),
      )
      .execute();

    return {
      inserted: Number(result[0]?.numInsertedOrUpdatedRows ?? 0),
    };
  }

  async removeAssets(serverId: string, dto: AssetIdsDto) {
    await this.checkExists(serverId);

    const result = await this.db
      .deleteFrom('asset_servers')
      .where('server_id', '=', serverId)
      .where('asset_id', 'in', dto.asset_ids)
      .execute();

    return {
      deleted: Number(result[0]?.numDeletedRows ?? 0),
    };
  }

  async listAssets(serverId: string) {
    await this.checkExists(serverId);

    return this.db
      .selectFrom('asset_servers')
      .innerJoin('assets', 'assets.id', 'asset_servers.asset_id')
      .select([
        'assets.id',
        'assets.name',
        'assets.status',
        'assets.primary_contact_name',
        'assets.primary_contact_email',
        'assets.type as type_name',
      ])
      .where('asset_servers.server_id', '=', serverId)
      .where('assets.deleted_at', 'is', null)
      .execute();
  }

  // ── Renewal tracking ──

  async getExpiringServers(days: number = 30) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    return this.db
      .selectFrom('servers')
      .innerJoin('service_providers', 'service_providers.id', 'servers.provider_id')
      .select([
        'servers.id',
        'servers.label',
        'servers.renewal_date',
        'servers.monthly_cost',
        'servers.currency',
        'service_providers.name as provider_name',
        'service_providers.type as provider_type',
      ])
      .where('servers.renewal_date', '>=', now)
      .where('servers.renewal_date', '<=', threshold)
      .orderBy('servers.renewal_date', 'asc')
      .execute();
  }

  async getRenewalStats() {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const sixtyDays = new Date();
    sixtyDays.setDate(sixtyDays.getDate() + 60);
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const stats = await this.db
      .selectFrom('servers')
      .select([
        this.db.fn.countAll<number>().as('total'),
        this.db.fn
          .countAll<number>()
          .filterWhere('renewal_date', '>=', now)
          .filterWhere('renewal_date', '<=', thirtyDays)
          .as('renewing_30_days'),
        this.db.fn
          .countAll<number>()
          .filterWhere('renewal_date', '>', thirtyDays)
          .filterWhere('renewal_date', '<=', sixtyDays)
          .as('renewing_60_days'),
        this.db.fn
          .countAll<number>()
          .filterWhere('renewal_date', '>', sixtyDays)
          .filterWhere('renewal_date', '<=', ninetyDays)
          .as('renewing_90_days'),
        this.db.fn
          .sum<number>('monthly_cost')
          .filterWhere('renewal_date', '>=', now)
          .filterWhere('renewal_date', '<=', thirtyDays)
          .as('cost_at_risk'),
      ])
      .executeTakeFirst();

    return {
      total: Number(stats?.total ?? 0),
      renewing_30_days: Number(stats?.renewing_30_days ?? 0),
      renewing_60_days: Number(stats?.renewing_60_days ?? 0),
      renewing_90_days: Number(stats?.renewing_90_days ?? 0),
      monthly_cost_at_risk: Number(stats?.cost_at_risk ?? 0),
    };
  }

  async getTotalMonthlyCost() {
    const result = await this.db
      .selectFrom('servers')
      .select(this.db.fn.sum<number>('monthly_cost').as('total_cost'))
      .executeTakeFirst();

    return { total_monthly_cost: Number(result?.total_cost ?? 0) };
  }

  // ── IP provider detection ──

  /** Extract the organization name from IP RDAP response */
  private extractOrgNameFromRdap(result: unknown): string | undefined {
    const entities = (result as { entities?: Array<{ vcardArray?: [string, Array<[string, unknown, string, string]>] }> }).entities;
    if (!entities) return undefined;

    for (const entity of entities) {
      const vcard = entity.vcardArray?.[1];
      if (!vcard) continue;
      for (const field of vcard) {
        if (field[0] === 'fn' && field[3]) {
          return field[3] as string;
        }
      }
    }
    return undefined;
  }

  /** Convert country code to full country name */
  private countryCodeToName(code: string): string | undefined {
    const map: Record<string, string> = {
      US: 'United States',
      CA: 'Canada',
      GB: 'United Kingdom',
      DE: 'Germany',
      FR: 'France',
      NL: 'Netherlands',
      AU: 'Australia',
      JP: 'Japan',
      SG: 'Singapore',
      IN: 'India',
      BR: 'Brazil',
      RU: 'Russia',
      CN: 'China',
      HK: 'Hong Kong',
      KR: 'South Korea',
      TW: 'Taiwan',
      SE: 'Sweden',
      FI: 'Finland',
      NO: 'Norway',
      DK: 'Denmark',
      IE: 'Ireland',
      IT: 'Italy',
      ES: 'Spain',
      CH: 'Switzerland',
      AT: 'Austria',
      BE: 'Belgium',
      PL: 'Poland',
      CZ: 'Czech Republic',
      ZA: 'South Africa',
      AE: 'United Arab Emirates',
      IL: 'Israel',
      NZ: 'New Zealand',
      MX: 'Mexico',
      AR: 'Argentina',
      CO: 'Colombia',
      CL: 'Chile',
      PT: 'Portugal',
      GR: 'Greece',
      HU: 'Hungary',
      RO: 'Romania',
      UA: 'Ukraine',
      TR: 'Turkey',
      MY: 'Malaysia',
      ID: 'Indonesia',
      PH: 'Philippines',
      TH: 'Thailand',
      VN: 'Vietnam',
      EG: 'Egypt',
      NG: 'Nigeria',
      KE: 'Kenya',
    };
    return map[code.toUpperCase()] ?? undefined;
  }

  /** Extract location info (region, city, country) from IP RDAP response */
  private extractLocationFromRdap(result: unknown): {
    region?: string;
    city?: string;
    country?: string;
  } {
    // 1. Check top-level country field (present in most RIR responses)
    const topLevelResult = result as { country?: string } | null;
    let topLevelCountry: string | undefined;
    if (topLevelResult?.country) {
      const code = topLevelResult.country.trim();
      topLevelCountry = this.countryCodeToName(code) || code;
    }

    // 2. Check vCard adr fields for detailed location
    const entities = (result as { entities?: Array<{ vcardArray?: [string, Array<[string, unknown, string, string | string[]]>] }> }).entities;
    if (!entities) {
      // Fall back to just the top-level country
      if (topLevelCountry) return { country: topLevelCountry };
      return {};
    }

    let vcardCountry: string | undefined;
    let vcardRegion: string | undefined;
    let vcardCity: string | undefined;

    for (const entity of entities) {
      const vcard = entity.vcardArray?.[1];
      if (!vcard) continue;
      for (const field of vcard) {
        // adr field: ["adr", params, "text", [pobox, ext, street, locality, region, code, country]]
        if (field[0] === 'adr' && Array.isArray(field[3])) {
          const adrParts = field[3] as string[];
          vcardCity = vcardCity || adrParts[3]?.trim() || undefined;
          vcardRegion = vcardRegion || adrParts[4]?.trim() || undefined;
          const adrCountry = adrParts[6]?.trim();
          if (adrCountry) {
            vcardCountry = this.countryCodeToName(adrCountry) || adrCountry;
          }
        }
      }
    }

    // Prefer vCard data over top-level country (more specific), but use top-level as fallback
    const country = vcardCountry || topLevelCountry;
    if (vcardCity || vcardRegion || country) {
      return { region: vcardRegion, city: vcardCity, country };
    }

    return {};
  }

  /** Try to match an organization name to a provider in the database, auto-creating if not found */
  private async matchOrgToProvider(orgName: string): Promise<string | undefined> {
    if (!orgName) return undefined;

    const normalized = orgName.toLowerCase().trim();

    // 1. Exact match
    const exact = await this.db
      .selectFrom('service_providers')
      .select('id')
      .where('type', '=', 'hosting')
      .where(sql`LOWER(name)`, '=', normalized)
      .executeTakeFirst();
    if (exact) return exact.id;

    // Also try matching against providers without a type filter (e.g., 'registrar' + 'hosting' types)
    const exactAnyType = await this.db
      .selectFrom('service_providers')
      .select('id')
      .where(sql`LOWER(name)`, '=', normalized)
      .executeTakeFirst();
    if (exactAnyType) return exactAnyType.id;

    // 2. Fetch all providers and fuzzy match
    const allProviders = await this.db
      .selectFrom('service_providers')
      .select(['id', 'name'])
      .execute();

    // Check if any provider name is contained within the organization name
    for (const p of allProviders) {
      if (normalized.includes(p.name.toLowerCase())) {
        return p.id;
      }
    }

    // 3. Organization name is contained within a provider name
    for (const p of allProviders) {
      if (p.name.toLowerCase().includes(normalized)) {
        return p.id;
      }
    }

    // 4. Match by first word
    const firstWord = normalized.split(/[\s,]+/)[0];
    if (firstWord) {
      for (const p of allProviders) {
        if (p.name.toLowerCase().startsWith(firstWord)) {
          return p.id;
        }
      }
    }

    // 5. No match found — auto-create a new provider record (type: hosting)
    this.logger.log(
      `Auto-creating hosting provider from IP RDAP data: "${orgName}"`,
    );
    const created = await this.db
      .insertInto('service_providers')
      .values({
        name: orgName.trim(),
        type: ProviderType.HOSTING,
        website: null,
        notes: null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return created.id;
  }

  /** Resolve a hostname to an IPv4 address */
  private async resolveHostname(hostname: string): Promise<string | null> {
    try {
      const addresses = await dns.resolve4(hostname);
      return addresses[0] ?? null;  
    } catch {
      return null;
    }
  }

  /** Detect provider from an IP address or hostname using RDAP lookup */
  async detectProviderByIp(input: string) {
    let targetIp = input;

    // Check if input is already an IPv4 address
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = input.match(ipv4Regex);

    if (ipMatch) {
      // Validate each octet
      for (let i = 1; i <= 4; i++) {
        const octet = parseInt(ipMatch[i], 10);
        if (octet < 0 || octet > 255) {
          throw new BadRequestException(`Invalid IP address: "${input}"`);
        }
      }
    } else {
      // Not an IP — try resolving as a hostname
      this.logger.log(`Resolving hostname: ${input}`);
      const resolved = await this.resolveHostname(input);
      if (!resolved) {
        throw new BadRequestException(
          `Could not resolve "${input}" — enter a valid IP address or hostname`,
        );
      }
      targetIp = resolved;
      this.logger.log(`Resolved ${input} → ${resolved}`);
    }

    this.logger.log(`Looking up provider for IP: ${targetIp}`);

    try {
      const result = await rdap.ip(targetIp);
      const orgName = this.extractOrgNameFromRdap(result);
      const location = this.extractLocationFromRdap(result);

      if (!orgName) {
        return {
          detected: false,
          message: 'No organization info found for this IP',
          ...location,
        };
      }

      const providerId = await this.matchOrgToProvider(orgName);

      return {
        detected: true,
        provider_id: providerId,
        organization: orgName,
        ...location,
      };
    } catch (err: unknown) {
      this.logger.warn(
        `IP RDAP lookup failed for ${targetIp}: ${err instanceof Error ? err.message : err}`,
      );
      return {
        detected: false,
        message: 'Could not detect provider from this IP',
      };
    }
  }

  // ── Helpers ──

  private async checkExists(id: string) {
    const server = await this.db
      .selectFrom('servers')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();

    if (!server) throw new NotFoundException(`Server ${id} not found`);
    return server;
  }
}
