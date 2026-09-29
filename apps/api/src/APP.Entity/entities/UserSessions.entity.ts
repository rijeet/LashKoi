import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SysUsers } from './SysUsers.entity';

@Entity('user_sessions')
export class UserSessions {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'family_id', type: 'uuid' })
  familyId!: string;

  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 64 })
  refreshTokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'revoke_reason', type: 'varchar', length: 100, nullable: true })
  revokeReason?: string | null;

  @Column({ name: 'replaced_by_id', type: 'uuid', nullable: true })
  replacedById?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ip?: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => SysUsers, (u) => u.sessions)
  @JoinColumn({ name: 'user_id' })
  user!: SysUsers;
}
