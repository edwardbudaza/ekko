import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { StructuresService } from '../structures/structures.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private structuresService: StructuresService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async findAll(currentUserId: string): Promise<User[]> {
    const currentUser = await this.findOne(currentUserId);
    if (!currentUser.structureId) {
      throw new ForbiddenException('User has no assigned structure');
    }

    const accessibleStructures =
      await this.structuresService.findUserAccessibleStructures(
        currentUserId,
        currentUser.structureId,
      );

    const structureIds = accessibleStructures.map((structure) => structure.id);

    return this.usersRepository.find({
      where: {
        structureId: In(structureIds),
      },
      relations: ['structure'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['structure'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['structure'],
    });
    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async canAccessUser(
    currentUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const currentUser = await this.findOne(currentUserId);
    const targetUser = await this.findOne(targetUserId);

    if (!currentUser.structureId || !targetUser.structureId) {
      return false;
    }

    const accessibleStructures =
      await this.structuresService.findUserAccessibleStructures(
        currentUserId,
        currentUser.structureId,
      );

    return accessibleStructures.some(
      (structure) => structure.id === targetUser.structureId,
    );
  }
}
