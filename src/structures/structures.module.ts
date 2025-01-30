import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { StructuresService } from './structures.service';
import { StructuresController } from './structures.controller';
import { Structure } from './entities/structure.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Structure]),
    CacheModule.register(),
    ConfigModule,
  ],
  providers: [StructuresService],
  controllers: [StructuresController],
  exports: [StructuresService],
})
export class StructuresModule {}
