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
    const cacheKey = `users_accessible_${currentUserId}`;
    const cached = await this.cacheManager.get<User[]>(cacheKey);
    if (cached) {
      return cached;
    }

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

    const users = await this.usersRepository.find({
      where: {
        structureId: In(structureIds),
      },
      relations: ['structure', 'permissions'],
      cache: {
        id: cacheKey,
        milliseconds: this.CACHE_TTL * 1000,
      },
    });

    await this.cacheManager.set(cacheKey, users, this.CACHE_TTL);
    return users;
  }

  async findOne(id: string): Promise<User> {
    const cacheKey = `user_${id}`;
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['structure', 'permissions'],
      cache: {
        id: cacheKey,
        milliseconds: this.CACHE_TTL * 1000,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    await this.cacheManager.set(cacheKey, user, this.CACHE_TTL);
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const cacheKey = `user_email_${email}`;
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['structure', 'permissions'],
      cache: {
        id: cacheKey,
        milliseconds: this.CACHE_TTL * 1000,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }

    await this.cacheManager.set(cacheKey, user, this.CACHE_TTL);
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
    const cacheKey = `access_${currentUserId}_${targetUserId}`;
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const currentUser = await this.findOne(currentUserId);
    const targetUser = await this.findOne(targetUserId);

    if (!currentUser.structureId || !targetUser.structureId) {
      await this.cacheManager.set(cacheKey, false, this.CACHE_TTL);
      return false;
    }

    const accessibleStructures =
      await this.structuresService.findUserAccessibleStructures(
        currentUserId,
        currentUser.structureId,
      );

    const hasAccess = accessibleStructures.some(
      (structure) => structure.id === targetUser.structureId,
    );

    await this.cacheManager.set(cacheKey, hasAccess, this.CACHE_TTL);
    return hasAccess;
  }

  private async clearUserCaches(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['permissions'],
    });
    if (user) {
      await Promise.all([
        this.cacheManager.del(`user_${userId}`),
        this.cacheManager.del(`user_email_${user.email}`),
        this.cacheManager.del(`users_accessible_${userId}`),
      ]);
    }
  }
}
