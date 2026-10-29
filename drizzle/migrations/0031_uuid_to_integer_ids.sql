CREATE TEMP TABLE "_uuid_id_tables" (
  "table_name" text PRIMARY KEY
) ON COMMIT DROP;
--> statement-breakpoint
INSERT INTO "_uuid_id_tables" ("table_name") VALUES
  ('modules'),
  ('menus'),
  ('roles'),
  ('branches'),
  ('companies'),
  ('outlets'),
  ('asset_brands'),
  ('asset_categories'),
  ('asset_codes'),
  ('asset_specs'),
  ('banks'),
  ('customers'),
  ('processors'),
  ('rams'),
  ('storages'),
  ('supplier_accounts'),
  ('suppliers'),
  ('asset_datas'),
  ('photo_assets'),
  ('po_details'),
  ('pr_details'),
  ('pr_specifications'),
  ('purchase_orders'),
  ('purchase_requests'),
  ('asset_transfers'),
  ('maintenances'),
  ('rent_asset_details'),
  ('rent_assets'),
  ('rent_photo_assets');
--> statement-breakpoint
DO $$
DECLARE
  target record;
  source_type text;
BEGIN
  IF (SELECT count(*) FROM "_uuid_id_tables") <> 29 THEN
    RAISE EXCEPTION 'Expected 29 UUID primary-key tables';
  END IF;

  FOR target IN SELECT "table_name" FROM "_uuid_id_tables" ORDER BY "table_name" LOOP
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO source_type
      FROM pg_attribute a
      JOIN pg_class t ON t.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND t.relname = target."table_name"
       AND a.attname = 'id'
       AND NOT a.attisdropped;

    IF source_type IS DISTINCT FROM 'uuid' THEN
      RAISE EXCEPTION 'Expected public.%.id to be uuid, found %', target."table_name", source_type;
    END IF;

    IF EXISTS (
      SELECT 1
        FROM pg_attribute a
        JOIN pg_class t ON t.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public'
         AND t.relname = target."table_name"
         AND a.attname = 'id__int'
         AND NOT a.attisdropped
    ) THEN
      RAISE EXCEPTION 'Temporary column public.%.id__int already exists', target."table_name";
    END IF;

    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE', target."table_name");
  END LOOP;
END $$;
--> statement-breakpoint
CREATE TEMP TABLE "_uuid_fk_plan" ON COMMIT DROP AS
SELECT
  c.conname AS "constraint_name",
  child.relname AS "child_table",
  child_column.attname AS "child_column",
  child_column.attnotnull AS "child_not_null",
  parent.relname AS "parent_table",
  parent_column.attname AS "parent_column",
  pg_get_constraintdef(c.oid, true) AS "definition"
FROM pg_constraint c
JOIN pg_class child ON child.oid = c.conrelid
JOIN pg_namespace child_namespace ON child_namespace.oid = child.relnamespace
JOIN pg_class parent ON parent.oid = c.confrelid
JOIN pg_namespace parent_namespace ON parent_namespace.oid = parent.relnamespace
JOIN LATERAL unnest(c.conkey) WITH ORDINALITY child_key(attnum, position) ON true
JOIN LATERAL unnest(c.confkey) WITH ORDINALITY parent_key(attnum, position)
  ON parent_key.position = child_key.position
JOIN pg_attribute child_column
  ON child_column.attrelid = child.oid
 AND child_column.attnum = child_key.attnum
JOIN pg_attribute parent_column
  ON parent_column.attrelid = parent.oid
 AND parent_column.attnum = parent_key.attnum
JOIN "_uuid_id_tables" target ON target."table_name" = parent.relname
WHERE c.contype = 'f'
  AND child_namespace.nspname = 'public'
  AND parent_namespace.nspname = 'public'
  AND cardinality(c.conkey) = 1
  AND parent_column.attname = 'id'
  AND child_column.atttypid = 'uuid'::regtype;
--> statement-breakpoint
DO $$
BEGIN
  IF (SELECT count(*) FROM "_uuid_fk_plan") <> 34 THEN
    RAISE EXCEPTION 'Expected 34 UUID foreign keys, found %', (SELECT count(*) FROM "_uuid_fk_plan");
  END IF;
END $$;
--> statement-breakpoint
CREATE TEMP TABLE "_uuid_pk_plan" ON COMMIT DROP AS
SELECT
  c.conname AS "constraint_name",
  t.relname AS "table_name",
  pg_get_constraintdef(c.oid, true) AS "definition"
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN "_uuid_id_tables" target ON target."table_name" = t.relname
WHERE c.contype = 'p'
  AND n.nspname = 'public';
--> statement-breakpoint
DO $$
BEGIN
  IF (SELECT count(*) FROM "_uuid_pk_plan") <> 29 THEN
    RAISE EXCEPTION 'Expected 29 UUID primary-key constraints';
  END IF;
END $$;
--> statement-breakpoint
CREATE TEMP TABLE "_uuid_columns" ON COMMIT DROP AS
SELECT "table_name", 'id'::text AS "column_name" FROM "_uuid_id_tables"
UNION
SELECT "child_table", "child_column" FROM "_uuid_fk_plan";
--> statement-breakpoint
CREATE TEMP TABLE "_uuid_index_plan" ON COMMIT DROP AS
SELECT DISTINCT
  index_namespace.nspname AS "schema_name",
  index_class.relname AS "index_name",
  pg_get_indexdef(index_class.oid) AS "definition"
FROM pg_index i
JOIN pg_class table_class ON table_class.oid = i.indrelid
JOIN pg_namespace table_namespace ON table_namespace.oid = table_class.relnamespace
JOIN pg_class index_class ON index_class.oid = i.indexrelid
JOIN pg_namespace index_namespace ON index_namespace.oid = index_class.relnamespace
JOIN LATERAL unnest(i.indkey) key(attnum) ON key.attnum > 0
JOIN pg_attribute a
  ON a.attrelid = table_class.oid
 AND a.attnum = key.attnum
JOIN "_uuid_columns" target
  ON target."table_name" = table_class.relname
 AND target."column_name" = a.attname
LEFT JOIN pg_constraint c ON c.conindid = index_class.oid
WHERE table_namespace.nspname = 'public'
  AND c.oid IS NULL;
--> statement-breakpoint
DO $$
DECLARE
  target record;
  sequence_name text;
  next_id bigint;
BEGIN
  FOR target IN SELECT "table_name" FROM "_uuid_id_tables" ORDER BY "table_name" LOOP
    sequence_name := target."table_name" || '_id_seq';

    IF to_regclass(format('public.%I', sequence_name)) IS NOT NULL THEN
      RAISE EXCEPTION 'Sequence public.% already exists', sequence_name;
    END IF;

    EXECUTE format('CREATE SEQUENCE public.%I AS integer', sequence_name);
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN id__int integer NOT NULL DEFAULT nextval(%L::regclass)',
      target."table_name",
      'public.' || quote_ident(sequence_name)
    );
    EXECUTE format(
      'ALTER SEQUENCE public.%I OWNED BY public.%I.id__int',
      sequence_name,
      target."table_name"
    );

    EXECUTE format('SELECT COALESCE(max(id__int), 0) + 1 FROM public.%I', target."table_name") INTO next_id;
    PERFORM setval(format('public.%I', sequence_name)::regclass, next_id, false);
  END LOOP;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  relation record;
  missing_count bigint;
BEGIN
  FOR relation IN SELECT * FROM "_uuid_fk_plan" ORDER BY "child_table", "child_column" LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN %I integer',
      relation."child_table",
      relation."child_column" || '__int'
    );
    EXECUTE format(
      'UPDATE public.%I child SET %I = parent.id__int FROM public.%I parent WHERE child.%I = parent.id',
      relation."child_table",
      relation."child_column" || '__int',
      relation."parent_table",
      relation."child_column"
    );
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %I IS NOT NULL AND %I IS NULL',
      relation."child_table",
      relation."child_column",
      relation."child_column" || '__int'
    ) INTO missing_count;

    IF missing_count <> 0 THEN
      RAISE EXCEPTION 'Unmapped values in public.%.%', relation."child_table", relation."child_column";
    END IF;
  END LOOP;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT * FROM "_uuid_fk_plan" ORDER BY "child_table", "constraint_name" LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', item."child_table", item."constraint_name");
  END LOOP;

  FOR item IN SELECT * FROM "_uuid_pk_plan" ORDER BY "table_name" LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', item."table_name", item."constraint_name");
  END LOOP;

  FOR item IN SELECT * FROM "_uuid_index_plan" ORDER BY "schema_name", "index_name" LOOP
    EXECUTE format('DROP INDEX %I.%I', item."schema_name", item."index_name");
  END LOOP;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  relation record;
  target record;
BEGIN
  FOR relation IN SELECT * FROM "_uuid_fk_plan" ORDER BY "child_table", "child_column" LOOP
    EXECUTE format(
      'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
      relation."child_table",
      relation."child_column",
      relation."child_column" || '__uuid'
    );
    EXECUTE format(
      'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
      relation."child_table",
      relation."child_column" || '__int',
      relation."child_column"
    );
    IF relation."child_not_null" THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I SET NOT NULL',
        relation."child_table",
        relation."child_column"
      );
    END IF;
  END LOOP;

  FOR target IN SELECT "table_name" FROM "_uuid_id_tables" ORDER BY "table_name" LOOP
    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN id TO id__uuid', target."table_name");
    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN id__int TO id', target."table_name");
  END LOOP;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  relation record;
  target record;
BEGIN
  FOR relation IN SELECT * FROM "_uuid_fk_plan" ORDER BY "child_table", "child_column" LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP COLUMN %I',
      relation."child_table",
      relation."child_column" || '__uuid'
    );
  END LOOP;

  FOR target IN SELECT "table_name" FROM "_uuid_id_tables" ORDER BY "table_name" LOOP
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN id__uuid', target."table_name");
  END LOOP;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT * FROM "_uuid_pk_plan" ORDER BY "table_name" LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I %s',
      item."table_name",
      item."constraint_name",
      item."definition"
    );
  END LOOP;

  FOR item IN SELECT * FROM "_uuid_fk_plan" ORDER BY "child_table", "constraint_name" LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I %s',
      item."child_table",
      item."constraint_name",
      item."definition"
    );
  END LOOP;

  FOR item IN SELECT * FROM "_uuid_index_plan" ORDER BY "schema_name", "index_name" LOOP
    EXECUTE item."definition";
  END LOOP;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  target record;
  relation record;
  actual_type text;
  invalid_count bigint;
  sequence_name text;
  next_id bigint;
BEGIN
  FOR target IN SELECT "table_name" FROM "_uuid_id_tables" ORDER BY "table_name" LOOP
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO actual_type
      FROM pg_attribute a
      JOIN pg_class t ON t.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND t.relname = target."table_name"
       AND a.attname = 'id'
       AND NOT a.attisdropped;

    IF actual_type IS DISTINCT FROM 'integer' THEN
      RAISE EXCEPTION 'Expected public.%.id to be integer, found %', target."table_name", actual_type;
    END IF;

    sequence_name := target."table_name" || '_id_seq';
    EXECUTE format(
      'ALTER SEQUENCE public.%I OWNED BY public.%I.id',
      sequence_name,
      target."table_name"
    );
    EXECUTE format('SELECT COALESCE(max(id), 0) + 1 FROM public.%I', target."table_name") INTO next_id;
    PERFORM setval(format('public.%I', sequence_name)::regclass, next_id, false);
  END LOOP;

  FOR relation IN SELECT * FROM "_uuid_fk_plan" ORDER BY "child_table", "child_column" LOOP
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO actual_type
      FROM pg_attribute a
      JOIN pg_class t ON t.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND t.relname = relation."child_table"
       AND a.attname = relation."child_column"
       AND NOT a.attisdropped;

    IF actual_type IS DISTINCT FROM 'integer' THEN
      RAISE EXCEPTION 'Expected public.%.% to be integer, found %', relation."child_table", relation."child_column", actual_type;
    END IF;

    EXECUTE format(
      'SELECT count(*) FROM public.%I child LEFT JOIN public.%I parent ON child.%I = parent.id WHERE child.%I IS NOT NULL AND parent.id IS NULL',
      relation."child_table",
      relation."parent_table",
      relation."child_column",
      relation."child_column"
    ) INTO invalid_count;

    IF invalid_count <> 0 THEN
      RAISE EXCEPTION 'Orphaned values after conversion in public.%.%', relation."child_table", relation."child_column";
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
      FROM pg_attribute a
      JOIN pg_class t ON t.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND NOT a.attisdropped
       AND (a.attname LIKE '%\_\_uuid' ESCAPE '\' OR a.attname LIKE '%\_\_int' ESCAPE '\')
  ) THEN
    RAISE EXCEPTION 'Temporary UUID migration columns remain';
  END IF;
END $$;