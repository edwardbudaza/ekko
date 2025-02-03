import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { StructuresService } from '../structures/structures.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from './enums/user-role.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UsersService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private structuresService: StructuresService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.SALT_ROUNDS,
    );

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);
    await this.clearUserCaches(savedUser.id);
    return savedUser;
  }

  async findAll(currentUserId: string): Promise<User[]> {
    const currentUser = await this.findOne(currentUserId);

    // Admin can see all users
    if (currentUser.role === UserRole.ADMIN) {
      return this.usersRepository.find({
        relations: ['structure'],
      });
    }

    // If user has no structure, they can only see themselves
    if (!currentUser.structureId) {
      return [currentUser];
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
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        this.SALT_ROUNDS,
      );
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);
    await this.clearUserCaches(id);
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    await this.clearUserCaches(id);
  }

  async canAccessUser(
    currentUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const currentUser = await this.findOne(currentUserId);

    // Admin can access any user
    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }

    const targetUser = await this.findOne(targetUserId);

    // Users can always access themselves
    if (currentUserId === targetUserId) {
      return true;
    }

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

  private async clearUserCaches(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (user) {
      await Promise.all([
        this.cacheManager.del(`user_${userId}`),
        this.cacheManager.del(`user_email_${user.email}`),
      ]);
    }
  }
}
