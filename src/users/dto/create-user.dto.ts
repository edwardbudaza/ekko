import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
