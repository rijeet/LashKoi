import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('incident_audit')
export class IncidentAudit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'incident_id', type: 'uuid' })
  incidentId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'varchar', length: 40 })
  action!: string;

  @Column({ type: 'jsonb', nullable: true })
  diff?: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  at!: Date;
}
