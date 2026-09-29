import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5TrgmAudit1739000000000 implements MigrationInterface {
  name = 'Phase5TrgmAudit1739000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(`
      CREATE TABLE incident_audit (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        user_id uuid NULL REFERENCES sys_users(id) ON DELETE SET NULL,
        action varchar(40) NOT NULL,
        diff jsonb NULL,
        at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_incident_audit_incident_at ON incident_audit(incident_id, at DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX idx_incidents_title_en_trgm ON incidents USING gin (title_en gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_incidents_title_bn_trgm ON incidents USING gin (title_bn gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_incidents_summary_en_trgm ON incidents USING gin (summary_en gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_incidents_place_name_en_trgm ON incidents USING gin (place_name_en gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_place_name_en_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_summary_en_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_title_bn_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_title_en_trgm`);
    await queryRunner.query(`DROP TABLE IF EXISTS incident_audit`);
  }
}
