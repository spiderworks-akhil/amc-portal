import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { DB } from '../../db/types.generated';

@Injectable()
export class UsersService {
  constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

  async listActiveUsers() {
    return this.db
      .selectFrom('users')
      .select(['id', 'name', 'email'])
      .where('is_active', '=', true)
      .orderBy('name', 'asc')
      .execute();
  }
}
