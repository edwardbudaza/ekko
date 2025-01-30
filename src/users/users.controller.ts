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
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.NATIONAL)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  async findAll(@Request() req) {
    const currentUserId = req.user.id;
    return this.usersService.findAll(currentUserId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const currentUserId = req.user.id;
    const canAccess = await this.usersService.canAccessUser(currentUserId, id);
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
    const currentUserId = req.user.id;
    const canAccess = await this.usersService.canAccessUser(currentUserId, id);
    if (!canAccess) {
      throw new ForbiddenException(
        'You do not have permission to modify this user',
      );
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.NATIONAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req, @Param('id') id: string) {
    const currentUserId = req.user.id;
    const canAccess = await this.usersService.canAccessUser(currentUserId, id);
    if (!canAccess) {
      throw new ForbiddenException(
        'You do not have permission to delete this user',
      );
    }
    return this.usersService.remove(id);
  }
}
