import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  async findAll(@Request() req) {
    return this.usersService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    if (req.user.role === UserRole.ADMIN) {
      return this.usersService.findOne(id);
    }
    const canAccess = await this.usersService.canAccessUser(req.user.id, id);
    if (!canAccess) {
      throw new ForbiddenException(
        'You do not have permission to access this user',
      );
    }
    return this.usersService.findOne(id);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Admin can update any user
    if (req.user.role === UserRole.ADMIN) {
      return this.usersService.update(id, updateUserDto);
    }

    // Non-admin users can only update themselves
    if (req.user.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Non-admin users cannot update their role or structureId
    if (updateUserDto.role || updateUserDto.structureId) {
      throw new ForbiddenException('You cannot update role or structure');
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
