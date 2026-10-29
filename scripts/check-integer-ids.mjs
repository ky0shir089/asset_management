import assert from "node:assert/strict"
import "dotenv/config"
import pg from "pg"

const idTables = [
  "modules", "menus", "roles", "branches", "companies", "outlets",
  "asset_brands", "asset_categories", "asset_codes", "asset_specs", "banks",
  "customers", "processors", "rams", "storages", "supplier_accounts",
  "suppliers", "asset_datas", "photo_assets", "po_details", "pr_details",
  "pr_specifications", "purchase_orders", "purchase_requests", "asset_transfers",
  "maintenances", "rent_asset_details", "rent_assets", "rent_photo_assets",
]

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

try {
  const columns = await client.query(
    `select table_name, column_name, data_type
       from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
        and column_name = 'id'`,
    [idTables]
  )
  assert.equal(columns.rowCount, 29)
  assert.deepEqual(new Set(columns.rows.map((row) => row.data_type)), new Set(["integer"]))

  const foreignKeys = await client.query(
    `select child.relname child_table, child_column.attname child_column,
            parent.relname parent_table, c.convalidated
       from pg_constraint c
       join pg_class child on child.oid = c.conrelid
       join pg_class parent on parent.oid = c.confrelid
       join lateral unnest(c.conkey) with ordinality child_key(attnum, position) on true
       join lateral unnest(c.confkey) with ordinality parent_key(attnum, position)
         on parent_key.position = child_key.position
       join pg_attribute child_column
         on child_column.attrelid = child.oid and child_column.attnum = child_key.attnum
       join pg_attribute parent_column
         on parent_column.attrelid = parent.oid and parent_column.attnum = parent_key.attnum
      where c.contype = 'f'
        and cardinality(c.conkey) = 1
        and parent.relname = any($1::text[])
        and parent_column.attname = 'id'`,
    [idTables]
  )
  assert.equal(foreignKeys.rowCount, 34)
  assert.ok(foreignKeys.rows.every((row) => row.convalidated))

  for (const relation of foreignKeys.rows) {
    const result = await client.query(
      `select count(*)::int invalid
         from public.${client.escapeIdentifier(relation.child_table)} child
         left join public.${client.escapeIdentifier(relation.parent_table)} parent
           on child.${client.escapeIdentifier(relation.child_column)} = parent.id
        where child.${client.escapeIdentifier(relation.child_column)} is not null
          and parent.id is null`
    )
    assert.equal(result.rows[0].invalid, 0, `${relation.child_table}.${relation.child_column}`)
  }

  for (const table of idTables) {
    const result = await client.query(
      `select pg_get_serial_sequence($1, 'id') sequence_name,
              coalesce(max(id), 0)::bigint max_id
         from public.${client.escapeIdentifier(table)}`,
      [`public.${table}`]
    )
    assert.ok(result.rows[0].sequence_name, `${table}.id sequence missing`)
    const sequence = await client.query(
      `select last_value, is_called from ${result.rows[0].sequence_name}`
    )
    const nextValue = sequence.rows[0].is_called
      ? BigInt(sequence.rows[0].last_value) + 1n
      : BigInt(sequence.rows[0].last_value)
    assert.ok(nextValue > BigInt(result.rows[0].max_id), `${table}.id sequence collision`)
  }

  const temporaryColumns = await client.query(
    `select table_name, column_name
       from information_schema.columns
      where table_schema = 'public'
        and (column_name like '%\\_\\_uuid' escape '\\'
          or column_name like '%\\_\\_int' escape '\\')`
  )
  assert.equal(temporaryColumns.rowCount, 0)

  console.log("integer ID database checks passed")
} finally {
  await client.end()
}
