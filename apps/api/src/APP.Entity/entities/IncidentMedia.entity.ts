import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Incidents } from './Incidents.entity';

@Entity('incident_media')
export class IncidentMedia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'incident_id', type: 'uuid' })
  incidentId!: string;

  @Column({ type: 'varchar', length: 20 })
  kind!: string;

  @Column({ type: 'varchar', length: 512 })
  url!: string;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 512, nullable: true })
  thumbnailUrl?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  credit?: string | null;

  @ManyToOne(() => Incidents, (i) => i.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident!: Incidents;
}
