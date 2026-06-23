import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { DB } from '../../db/types.generated';
import { CreateNoteDto, ListNotesDto, UpdateNoteDto } from './dto';

@Injectable()
export class NotesService {
  constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

  async create(dto: CreateNoteDto, createdBy?: string) {
    const note = await this.db
      .insertInto('notes')
      .values({
        noteable_type: dto.noteable_type,
        noteable_id: dto.noteable_id,
        content: dto.content,
        created_by_id: createdBy ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const author = createdBy
      ? await this.db
          .selectFrom('users')
          .select(['id', 'name', 'email'])
          .where('id', '=', createdBy)
          .executeTakeFirst()
      : null;

    return { ...note, author: author ?? null };
  }

  async list(dto: ListNotesDto) {
    const { page = 1, limit = 50, noteable_type, noteable_id } = dto;
    const offset = (page - 1) * limit;

    const baseQuery = this.db
      .selectFrom('notes')
      .leftJoin('users', 'users.id', 'notes.created_by_id')
      .where('notes.noteable_type', '=', noteable_type)
      .where('notes.noteable_id', '=', noteable_id);

    const [{ total }, data] = await Promise.all([
      baseQuery
        .select(this.db.fn.countAll<number>().as('total'))
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      baseQuery
        .selectAll('notes')
        .select(['users.id as author_id', 'users.name as author_name', 'users.email as author_email'])
        .orderBy('notes.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    const transformed = data.map((row) => ({
      id: row.id,
      noteable_type: row.noteable_type,
      noteable_id: row.noteable_id,
      content: row.content,
      created_by_id: row.created_by_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: row.author_id
        ? { id: row.author_id as string, name: row.author_name as string, email: row.author_email as string }
        : null,
    }));

    return {
      data: transformed,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const note = await this.db
      .selectFrom('notes')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!note) throw new NotFoundException(`Note ${id} not found`);
    return note;
  }

  async update(id: string, dto: UpdateNoteDto) {
    const existing = await this.db
      .selectFrom('notes')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException(`Note ${id} not found`);
    }

    const updated = await this.db
      .updateTable('notes')
      .set({ content: dto.content, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    const author = existing.created_by_id
      ? await this.db
          .selectFrom('users')
          .select(['id', 'name', 'email'])
          .where('id', '=', existing.created_by_id)
          .executeTakeFirst()
      : null;

    return { ...updated, author: author ?? null };
  }

  async remove(id: string) {
    await this.checkExists(id);

    await this.db
      .deleteFrom('notes')
      .where('id', '=', id)
      .execute();

    return { message: 'Note deleted successfully' };
  }

  private async checkExists(id: string) {
    const note = await this.db
      .selectFrom('notes')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();

    if (!note) throw new NotFoundException(`Note ${id} not found`);
    return note;
  }
}
