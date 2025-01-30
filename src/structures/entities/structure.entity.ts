import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Tree,
  TreeChildren,
  TreeParent,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('structures')
@Tree('closure-table')
export class Structure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  level: string;

  @TreeChildren()
  children: Structure[];

  @TreeParent()
  parent: Structure;

  @OneToMany(() => User, (user) => user.structure)
  users: User[];

  @Column({ nullable: true })
  parentId: string;
}
