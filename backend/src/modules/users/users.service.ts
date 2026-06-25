import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import { ListUsersDto, UserSortBy, UserSortOrder } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

  async list(dto: ListUsersDto) {
    const {
      page = 1,
      limit = 50,
      search,
      sort_by = UserSortBy.NAME,
      sort_order = UserSortOrder.ASC,
    } = dto;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('users')
      .where('is_active', '=', true);

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) =>
        eb.or([
          eb('users.name', 'ilike', pattern),
          eb('users.email', 'ilike', pattern),
        ]),
      );
    }

    const sortColumn = this.mapSortField(sort_by);
    const order = sort_order === UserSortOrder.DESC ? sql`desc` : sql`asc`;

    const [{ total }, rows] = await Promise.all([
      query
        .select(this.db.fn.countAll<number>().as('total'))
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      query
        .clearSelect()
        .selectAll()
        .orderBy(sql`${sql.raw(sortColumn)}`, order)
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        is_active: row.is_active,
        last_login_at: row.last_login_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private mapSortField(field: UserSortBy): string {
    const map: Record<UserSortBy, string> = {
      [UserSortBy.NAME]: 'users.name',
      [UserSortBy.EMAIL]: 'users.email',
      [UserSortBy.ROLE]: 'users.role',
      [UserSortBy.CREATED_AT]: 'users.created_at',
      [UserSortBy.UPDATED_AT]: 'users.updated_at',
      [UserSortBy.IS_ACTIVE]: 'users.is_active',
      [UserSortBy.LAST_LOGIN_AT]: 'users.last_login_at',
    };
    return map[field];
  }

  /** Kept for backward compatibility — returns simple list used by manager assignment */
  async listActiveUsers() {
    return this.db
      .selectFrom('users')
      .select(['id', 'name', 'email'])
      .where('is_active', '=', true)
      .orderBy('name', 'asc')
      .execute();
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.db
      .selectFrom('users')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone || null;
    }

    if (Object.keys(updateData).length === 0) {
      return { message: 'No changes made' };
    }

    await this.db
      .updateTable('users')
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .execute();

    return { message: 'User updated successfully' };
  }
}
