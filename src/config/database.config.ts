import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from 'dotenv';

config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_DATABASE || 'ekko',
  entities: ['dist/**/*.entity{.ts,.js}'],
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
};
