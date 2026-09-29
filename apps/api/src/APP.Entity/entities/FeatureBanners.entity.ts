import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Incidents } from './Incidents.entity';

@Entity('feature_banners')
export class FeatureBanners {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'incident_id', type: 'uuid', nullable: true })
  incidentId?: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 512 })
  imageUrl!: string;

  @Column({ name: 'caption_en', type: 'varchar', length: 300, nullable: true })
  captionEn?: string | null;

  @Column({ name: 'caption_bn', type: 'varchar', length: 300, nullable: true })
  captionBn?: string | null;

  @Column({ name: 'section_type', type: 'varchar', length: 30 })
  sectionType!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt?: Date | null;

  @ManyToOne(() => Incidents, { nullable: true })
  @JoinColumn({ name: 'incident_id' })
  incident?: Incidents | null;
}
