import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { StructuresModule } from '../structures/structures.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    StructuresModule,
    CacheModule.registerAsync({
      useFactory: () => ({
        store: redisStore,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        ttl: 3600,
        max: 100000,
        isGlobal: true,
      }),
    }),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
