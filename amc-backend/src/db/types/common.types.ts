import { ColumnType, Generated } from "kysely";

export type Timestamp = ColumnType<
  Date,
  Date | string | undefined,
  Date | string
>;

export type Json = ColumnType<
  unknown,
  unknown,
  unknown
>;

export type UUID = Generated<string>;