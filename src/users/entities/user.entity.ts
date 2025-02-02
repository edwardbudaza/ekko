import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Structure } from '../../structures/entities/structure.entity';
import { UserRole } from '../enums/user-role.enum';
import { Permission } from '../../permissions/entities/permission.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: true,
  })
  role: UserRole;

  @ManyToOne(() => Structure, (structure) => structure.users)
  @JoinColumn({ name: 'structureId' })
  structure: Structure;

  @Column({ nullable: true })
  structureId: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Permission, (permission) => permission.user, {
    cascade: true,
    eager: true,
  })
  permissions: Permission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
