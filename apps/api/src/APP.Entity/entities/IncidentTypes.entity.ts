import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Incidents } from './Incidents.entity';

@Entity('incident_types')
export class IncidentTypes {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ name: 'label_en', type: 'varchar', length: 120 })
  labelEn!: string;

  @Column({ name: 'label_bn', type: 'varchar', length: 120 })
  labelBn!: string;

  @Column({ name: 'icon_key', type: 'varchar', length: 80 })
  iconKey!: string;

  @Column({ name: 'icon_url', type: 'varchar', length: 512, nullable: true })
  iconUrl?: string | null;

  @Column({ name: 'marker_color', type: 'varchar', length: 20 })
  markerColor!: string;

  @Column({ name: 'is_health', type: 'boolean', default: false })
  isHealth!: boolean;

  @Column({ name: 'content_warning', type: 'boolean', default: false })
  contentWarning!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Incidents, (i) => i.type)
  incidents!: Incidents[];
}
