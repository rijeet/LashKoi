import { MigrationInterface, QueryRunner } from 'typeorm';

export class BulkImportHarvest1740000000000 implements MigrationInterface {
  name = 'BulkImportHarvest1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE import_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by uuid NULL REFERENCES sys_users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        source varchar(10) NOT NULL,
        file_name varchar(300) NULL,
        idempotency_key varchar(120) NULL,
        row_count int NOT NULL DEFAULT 0,
        created_count int NOT NULL DEFAULT 0,
        skipped_count int NOT NULL DEFAULT 0,
        error_count int NOT NULL DEFAULT 0,
        dry_run boolean NOT NULL DEFAULT false,
        meta jsonb NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_import_batches_idempotency ON import_batches(idempotency_key) WHERE idempotency_key IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE import_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL UNIQUE,
        mapping jsonb NOT NULL,
        created_by uuid NULL REFERENCES sys_users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `ALTER TABLE incidents ADD COLUMN external_id varchar(80) NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_incidents_external_id ON incidents(external_id) WHERE external_id IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE incidents ADD COLUMN location_confirmed boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE incidents ADD COLUMN import_batch_id uuid NULL REFERENCES import_batches(id) ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE incidents DROP COLUMN IF EXISTS import_batch_id`,
    );
    await queryRunner.query(
      `ALTER TABLE incidents DROP COLUMN IF EXISTS location_confirmed`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_external_id`);
    await queryRunner.query(
      `ALTER TABLE incidents DROP COLUMN IF EXISTS external_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS import_profiles`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_batches_idempotency`);
    await queryRunner.query(`DROP TABLE IF EXISTS import_batches`);
  }
}
