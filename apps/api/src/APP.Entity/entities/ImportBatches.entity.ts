import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SysUsers } from './SysUsers.entity';

@Entity('import_batches')
export class ImportBatches {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'varchar', length: 10 })
  source!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 300, nullable: true })
  fileName?: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 120, nullable: true })
  idempotencyKey?: string | null;

  @Column({ name: 'row_count', type: 'int', default: 0 })
  rowCount!: number;

  @Column({ name: 'created_count', type: 'int', default: 0 })
  createdCount!: number;

  @Column({ name: 'skipped_count', type: 'int', default: 0 })
  skippedCount!: number;

  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount!: number;

  @Column({ name: 'dry_run', type: 'boolean', default: false })
  dryRun!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, unknown> | null;

  @ManyToOne(() => SysUsers, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: SysUsers | null;
}
