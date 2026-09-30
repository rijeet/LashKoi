import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SysUsers } from './SysUsers.entity';

@Entity('import_profiles')
export class ImportProfiles {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ type: 'jsonb' })
  mapping!: Record<string, string>;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => SysUsers, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: SysUsers | null;
}
