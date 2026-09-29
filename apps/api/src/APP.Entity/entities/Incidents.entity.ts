import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IncidentTypes } from './IncidentTypes.entity';
import { SysUsers } from './SysUsers.entity';
import { IncidentMedia } from './IncidentMedia.entity';
import { IncidentStatus } from '@shared/enums/IncidentStatus.enum';

@Entity('incidents')
export class Incidents {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ref_code', type: 'varchar', length: 32, unique: true })
  refCode!: string;

  @Column({ type: 'varchar', length: 220, unique: true })
  slug!: string;

  @Column({ name: 'type_id', type: 'uuid' })
  typeId!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string | null;

  @Column({ name: 'title_en', type: 'varchar', length: 500 })
  titleEn!: string;

  @Column({ name: 'title_bn', type: 'varchar', length: 500, nullable: true })
  titleBn?: string | null;

  @Column({ name: 'summary_en', type: 'text' })
  summaryEn!: string;

  @Column({ name: 'summary_bn', type: 'text', nullable: true })
  summaryBn?: string | null;

  @Column({ name: 'body_html', type: 'text', nullable: true })
  bodyHtml?: string | null;

  @Column({ name: 'place_name_en', type: 'varchar', length: 300, nullable: true })
  placeNameEn?: string | null;

  @Column({ name: 'place_name_bn', type: 'varchar', length: 300, nullable: true })
  placeNameBn?: string | null;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location!: string;

  @Column({ name: 'division_pcode', type: 'varchar', length: 20 })
  divisionPcode!: string;

  @Column({ name: 'district_pcode', type: 'varchar', length: 20 })
  districtPcode!: string;

  @Column({ name: 'upazila_pcode', type: 'varchar', length: 20, nullable: true })
  upazilaPcode?: string | null;

  @Column({ name: 'union_pcode', type: 'varchar', length: 20, nullable: true })
  unionPcode?: string | null;

  @Column({ name: 'source_label', type: 'varchar', length: 200, nullable: true })
  sourceLabel?: string | null;

  @Column({ name: 'source_url', type: 'varchar', length: 512, nullable: true })
  sourceUrl?: string | null;

  @Column({ name: 'banner_caption_en', type: 'varchar', length: 200, nullable: true })
  bannerCaptionEn?: string | null;

  @Column({ name: 'banner_caption_bn', type: 'varchar', length: 200, nullable: true })
  bannerCaptionBn?: string | null;

  @Column({ name: 'case_count', type: 'int', nullable: true })
  caseCount?: number | null;

  @Column({ type: 'varchar', length: 20, default: IncidentStatus.DRAFT })
  status!: IncidentStatus;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @ManyToOne(() => IncidentTypes, (t) => t.incidents)
  @JoinColumn({ name: 'type_id' })
  type!: IncidentTypes;

  @ManyToOne(() => SysUsers, (u) => u.incidents, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: SysUsers | null;

  @OneToMany(() => IncidentMedia, (m) => m.incident)
  media!: IncidentMedia[];
}
