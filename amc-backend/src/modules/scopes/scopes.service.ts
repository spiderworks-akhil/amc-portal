import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import { CreateScopeDto, UpdateScopeDto, LinkScopesDto } from './dto';

@Injectable()
export class ScopesService {
  constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

  async create(dto: CreateScopeDto, createdBy?: string) {
    return this.db
      .insertInto('scopes')
      .values({
        name: dto.name,
        description: dto.description ?? null,
        color: dto.color ?? '#6366f1',
        created_by_id: createdBy ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async listAll() {
    const data = await this.db
      .selectFrom('scopes')
      .selectAll()
      .orderBy('scopes.name', 'asc')
      .execute();

    // Enrich with asset count
    if (data.length > 0) {
      const scopeIds = data.map((s) => s.id);
      const counts = await this.db
        .selectFrom('asset_scopes')
        .select([
          'asset_scopes.scope_id',
          this.db.fn.countAll<number>().as('asset_count'),
        ])
        .where('asset_scopes.scope_id', 'in', scopeIds)
        .groupBy('asset_scopes.scope_id')
        .execute();

      const countMap = new Map(
        counts.map((r) => [r.scope_id, Number(r.asset_count ?? 0)]),
      );

      return data.map((s) => ({
        ...s,
        asset_count: countMap.get(s.id) ?? 0,
      }));
    }

    return data;
  }

  async getById(id: string) {
    const scope = await this.db
      .selectFrom('scopes')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!scope) throw new NotFoundException(`Scope ${id} not found`);
    return scope;
  }

  async update(id: string, dto: UpdateScopeDto) {
    await this.checkExists(id);

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.color !== undefined) updateData.color = dto.color;

    return this.db
      .updateTable('scopes')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async remove(id: string) {
    await this.checkExists(id);

    await this.db
      .deleteFrom('scopes')
      .where('id', '=', id)
      .execute();

    return { message: 'Scope deleted successfully' };
  }

  // ── Asset linking ──

  async addScopesToAsset(assetId: string, dto: LinkScopesDto) {
    const rows = dto.scope_ids.map((scope_id) => ({
      asset_id: assetId,
      scope_id,
    }));

    const result = await this.db
      .insertInto('asset_scopes')
      .values(rows)
      .onConflict((oc) =>
        oc.columns(['asset_id', 'scope_id']).doNothing(),
      )
      .execute();

    return {
      linked: Number(result[0]?.numInsertedOrUpdatedRows ?? 0),
    };
  }

  async removeScopesFromAsset(assetId: string, dto: LinkScopesDto) {
    const result = await this.db
      .deleteFrom('asset_scopes')
      .where('asset_id', '=', assetId)
      .where('scope_id', 'in', dto.scope_ids)
      .execute();

    return {
      unlinked: Number(result[0]?.numDeletedRows ?? 0),
    };
  }

  async listScopesForAsset(assetId: string) {
    return this.db
      .selectFrom('asset_scopes')
      .innerJoin('scopes', 'scopes.id', 'asset_scopes.scope_id')
      .selectAll('scopes')
      .where('asset_scopes.asset_id', '=', assetId)
      .orderBy('scopes.name', 'asc')
      .execute();
  }

  // ── Helpers ──

  private async checkExists(id: string) {
    const scope = await this.db
      .selectFrom('scopes')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();

    if (!scope) throw new NotFoundException(`Scope ${id} not found`);
    return scope;
  }
}
