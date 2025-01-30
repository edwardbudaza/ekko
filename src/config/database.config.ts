import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_PORT = '5433',
  DB_USERNAME = 'postgres',
  DB_PASSWORD = 'changeme',
  DB_NAME = 'ekko_challenge',
  NODE_ENV = 'development',
} = process.env;

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: NODE_ENV !== 'production',
  logging: NODE_ENV !== 'production',
};
