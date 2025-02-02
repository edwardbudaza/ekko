import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { StructuresService } from '../structures/structures.service';
import { Repository, In } from 'typeorm';
import { UserRole } from './enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let structuresService: StructuresService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockStructuresService = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findUserAccessibleStructures: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: StructuresService,
          useValue: mockStructuresService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    structuresService = module.get<StructuresService>(StructuresService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.SUBURB,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = new User();
      Object.assign(user, {
        ...createUserDto,
        password: hashedPassword,
      });

      mockUserRepository.create.mockReturnValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.create(createUserDto);

      expect(result).toEqual(user);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createUserDto.email,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          role: UserRole.SUBURB,
        }),
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });

    it('should throw ConflictException if user email already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.SUBURB,
      };

      mockUserRepository.findOne.mockResolvedValue({
        id: '1',
        ...createUserDto,
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all accessible users', async () => {
      const currentUser = {
        id: '1',
        structureId: 'structure1',
      };

      const accessibleStructures = [{ id: 'structure1' }, { id: 'structure2' }];

      const users = [
        { id: '1', email: 'user1@example.com', structureId: 'structure1' },
        { id: '2', email: 'user2@example.com', structureId: 'structure2' },
      ];

      mockUserRepository.findOne.mockResolvedValue(currentUser);
      mockStructuresService.findUserAccessibleStructures.mockResolvedValue(
        accessibleStructures,
      );
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.findAll('1');

      expect(result).toEqual(users);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: {
          structureId: In(['structure1', 'structure2']),
        },
        relations: ['structure', 'permissions'],
        cache: {
          id: 'users_accessible_1',
          milliseconds: 3600000,
        },
      });
    });

    it('should throw ForbiddenException if user has no structure', async () => {
      const currentUser = {
        id: '1',
        structureId: null,
      };

      mockUserRepository.findOne.mockResolvedValue(currentUser);

      await expect(service.findAll('1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should find a user by id', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne('1');

      expect(result).toEqual(user);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['structure', 'permissions'],
        cache: {
          id: 'user_1',
          milliseconds: 3600000,
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(user);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['structure', 'permissions'],
        cache: {
          id: 'user_email_test@example.com',
          milliseconds: 3600000,
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findByEmail('notfound@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';

      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'User',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, ...updateUserDto });

      const result = await service.update('1', updateUserDto);

      expect(result).toEqual({ ...user, ...updateUserDto });
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should hash password when updating password', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';

      const updateUserDto: UpdateUserDto = {
        password: 'newpassword123',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockImplementation(async (user) => user);

      const result = await service.update('1', updateUserDto);

      expect(await bcrypt.compare('newpassword123', result.password)).toBe(
        true,
      );
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.remove.mockResolvedValue(user);

      await service.remove('1');

      expect(mockUserRepository.remove).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('canAccessUser', () => {
    it('should return true if user can access target user', async () => {
      const currentUser = {
        id: '1',
        structureId: 'structure1',
      };

      const targetUser = {
        id: '2',
        structureId: 'structure2',
      };

      const accessibleStructures = [{ id: 'structure1' }, { id: 'structure2' }];

      mockUserRepository.findOne
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser);
      mockStructuresService.findUserAccessibleStructures.mockResolvedValue(
        accessibleStructures,
      );

      const result = await service.canAccessUser('1', '2');

      expect(result).toBe(true);
    });

    it('should return false if user cannot access target user', async () => {
      const currentUser = {
        id: '1',
        structureId: 'structure1',
      };

      const targetUser = {
        id: '2',
        structureId: 'structure3',
      };

      const accessibleStructures = [{ id: 'structure1' }, { id: 'structure2' }];

      mockUserRepository.findOne
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser);
      mockStructuresService.findUserAccessibleStructures.mockResolvedValue(
        accessibleStructures,
      );

      const result = await service.canAccessUser('1', '2');

      expect(result).toBe(false);
    });

    it('should return false if either user has no structure', async () => {
      const currentUser = {
        id: '1',
        structureId: null,
      };

      const targetUser = {
        id: '2',
        structureId: 'structure2',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser);

      const result = await service.canAccessUser('1', '2');

      expect(result).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    const BATCH_SIZE = 100;
    const CONCURRENT_REQUESTS = 10;

    const mockUsers = Array.from({ length: 100 }, (_, i) => ({
      id: `${i}`,
      email: `user${i}@example.com`,
      firstName: `User${i}`,
      lastName: 'Test',
      password: 'password',
      role: UserRole.SUBURB,
    }));

    it('should handle concurrent user creation efficiently', async () => {
      const startTime = process.hrtime();

      // Mock repository responses
      mockUserRepository.create.mockImplementation((dto) => ({
        ...dto,
        id: Math.random().toString(),
      }));
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      // Execute concurrent user creation
      const results = await Promise.all(
        Array(CONCURRENT_REQUESTS)
          .fill(null)
          .map(() =>
            service.create({
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              password: 'password',
              role: UserRole.SUBURB,
            }),
          ),
      );

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;

      // Verify performance metrics
      expect(results.length).toBe(CONCURRENT_REQUESTS);
      expect(duration).toBeLessThan(15); // Allow up to 15 seconds for concurrent operations
      expect(mockUserRepository.save).toHaveBeenCalledTimes(
        CONCURRENT_REQUESTS,
      );
    }, 30000);

    it('should handle bulk user retrieval efficiently', async () => {
      const structureIds = Array(5)
        .fill(null)
        .map((_, i) => `structure${i}`);
      const users = Array(BATCH_SIZE)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          email: `user${i}@example.com`,
          structureId: structureIds[i % 5],
        }));

      const currentUser = {
        id: '1',
        structureId: 'structure1',
      };

      mockUserRepository.findOne.mockResolvedValue(currentUser);
      mockStructuresService.findUserAccessibleStructures.mockResolvedValue(
        structureIds.map((id) => ({ id })),
      );
      mockUserRepository.find.mockResolvedValue(users);

      const startTime = process.hrtime();

      // Test with 5 batches
      const batchPromises = Array(5)
        .fill(null)
        .map(() => service.findAll('1'));
      const results = await Promise.allSettled(batchPromises);

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;

      expect(results.length).toBe(5);
      expect(duration).toBeLessThan(1);
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
      });
    }, 30000); // 30 seconds timeout

    it('should handle hierarchical structure access checks efficiently', async () => {
      const structureIds = Array(20)
        .fill(null)
        .map((_, i) => `structure${i}`);
      const accessibleStructures = structureIds.map((id) => ({ id }));

      const currentUser = {
        id: '1',
        structureId: 'structure1',
      };

      const targetUser = {
        id: '2',
        structureId: 'structure10',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser);
      mockStructuresService.findUserAccessibleStructures.mockResolvedValue(
        accessibleStructures,
      );

      const startTime = process.hrtime();

      // Test with 100 concurrent checks
      const accessCheckPromises = Array(CONCURRENT_REQUESTS)
        .fill(null)
        .map(() => service.canAccessUser('1', '2'));

      const results = await Promise.all(accessCheckPromises);

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;

      expect(results.length).toBe(CONCURRENT_REQUESTS);
      expect(duration).toBeLessThan(1);
      expect(
        mockStructuresService.findUserAccessibleStructures,
      ).toHaveBeenCalled();
    }, 30000); // 30 seconds timeout

    it('should maintain performance under sustained load', async () => {
      const TEST_DURATION_SECONDS = 2;
      const OPERATIONS_PER_SECOND = 50; // Scaled down for unit testing

      const currentUser = {
        id: '1',
        structureId: 'structure1',
      };

      mockUserRepository.findOne.mockResolvedValue(currentUser);
      mockStructuresService.findUserAccessibleStructures.mockResolvedValue([
        { id: 'structure1' },
        { id: 'structure2' },
      ]);

      const startTime = process.hrtime();

      // Simulate sustained load for TEST_DURATION_SECONDS
      const loadTestPromises = Array(
        OPERATIONS_PER_SECOND * TEST_DURATION_SECONDS,
      )
        .fill(null)
        .map((_, index) => {
          // Mix of different operations
          if (index % 3 === 0) {
            return service.findAll('1');
          } else if (index % 3 === 1) {
            return service.findOne('1');
          } else {
            return service.canAccessUser('1', '2');
          }
        });

      const results = await Promise.allSettled(loadTestPromises);

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;

      const successfulRequests = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const requestsPerSecond = successfulRequests / duration;

      expect(successfulRequests).toBe(loadTestPromises.length);
      expect(requestsPerSecond).toBeGreaterThan(OPERATIONS_PER_SECOND);
      expect(duration).toBeLessThan(TEST_DURATION_SECONDS * 1.2); // 20% margin
    }, 30000); // 30 seconds timeout
  });
});
