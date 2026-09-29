import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738000000000 implements MigrationInterface {
  name = 'InitialSchema1738000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE sys_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        role varchar(50) NOT NULL DEFAULT 'admin',
        is_active boolean NOT NULL DEFAULT true,
        failed_login_count int NOT NULL DEFAULT 0,
        locked_until timestamptz NULL,
        last_login_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE user_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
        family_id uuid NOT NULL,
        refresh_token_hash varchar(64) NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz NULL,
        revoke_reason varchar(100) NULL,
        replaced_by_id uuid NULL,
        ip varchar(100) NULL,
        user_agent varchar(512) NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_user_sessions_user ON user_sessions(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at)`,
    );

    await queryRunner.query(`
      CREATE TABLE incident_types (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL UNIQUE,
        label_en varchar(120) NOT NULL,
        label_bn varchar(120) NOT NULL,
        icon_key varchar(80) NOT NULL,
        icon_url varchar(512) NULL,
        marker_color varchar(20) NOT NULL,
        is_health boolean NOT NULL DEFAULT false,
        content_warning boolean NOT NULL DEFAULT false,
        sort_order int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE admin_areas (
        pcode varchar(20) PRIMARY KEY,
        parent_pcode varchar(20) NULL,
        level varchar(20) NOT NULL,
        name_en varchar(200) NOT NULL,
        name_bn varchar(200) NULL,
        division_pcode varchar(20) NULL,
        district_pcode varchar(20) NULL,
        centroid geography(Point, 4326) NULL,
        bbox_west float NULL,
        bbox_south float NULL,
        bbox_east float NULL,
        bbox_north float NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_admin_areas_parent_level ON admin_areas(parent_pcode, level)`,
    );

    await queryRunner.query(`
      CREATE TABLE incidents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ref_code varchar(32) NOT NULL UNIQUE,
        slug varchar(220) NOT NULL UNIQUE,
        type_id uuid NOT NULL REFERENCES incident_types(id),
        created_by uuid NULL REFERENCES sys_users(id),
        title_en varchar(500) NOT NULL,
        title_bn varchar(500) NULL,
        summary_en text NOT NULL,
        summary_bn text NULL,
        body_html text NULL,
        place_name_en varchar(300) NULL,
        place_name_bn varchar(300) NULL,
        location geography(Point, 4326) NOT NULL,
        division_pcode varchar(20) NOT NULL,
        district_pcode varchar(20) NOT NULL,
        upazila_pcode varchar(20) NULL,
        union_pcode varchar(20) NULL,
        source_label varchar(200) NULL,
        source_url varchar(512) NULL,
        banner_caption_en varchar(200) NULL,
        banner_caption_bn varchar(200) NULL,
        case_count int NULL,
        status varchar(20) NOT NULL DEFAULT 'draft',
        occurred_at timestamptz NOT NULL,
        published_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_incidents_location ON incidents USING GIST (location)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_incidents_status_occurred ON incidents(status, occurred_at DESC) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_incidents_type_occurred ON incidents(type_id, occurred_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_incidents_division ON incidents(division_pcode, occurred_at DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE incident_media (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        kind varchar(20) NOT NULL,
        url varchar(512) NOT NULL,
        thumbnail_url varchar(512) NULL,
        credit varchar(200) NULL,
        UNIQUE (incident_id, kind)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE feature_banners (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        incident_id uuid NULL REFERENCES incidents(id) ON DELETE SET NULL,
        image_url varchar(512) NOT NULL,
        caption_en varchar(300) NULL,
        caption_bn varchar(300) NULL,
        section_type varchar(30) NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        starts_at timestamptz NULL,
        ends_at timestamptz NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS feature_banners`);
    await queryRunner.query(`DROP TABLE IF EXISTS incident_media`);
    await queryRunner.query(`DROP TABLE IF EXISTS incidents`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_areas`);
    await queryRunner.query(`DROP TABLE IF EXISTS incident_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS sys_users`);
  }
}
