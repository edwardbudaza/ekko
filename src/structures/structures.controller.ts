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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StructuresService } from './structures.service';
import { Structure } from './entities/structure.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Structures')
@ApiBearerAuth()
@Controller('structures')
@UseGuards(JwtAuthGuard)
export class StructuresController {
  constructor(private readonly structuresService: StructuresService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new structure' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The structure has been successfully created.',
    type: Structure,
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createStructureDto: Partial<Structure>) {
    return this.structuresService.create(createStructureDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all structures' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all structures',
    type: [Structure],
  })
  findAll() {
    return this.structuresService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a structure by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The found structure',
    type: Structure,
  })
  findOne(@Param('id') id: string) {
    return this.structuresService.findOne(id);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Get all descendants of a structure' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of descendant structures',
    type: [Structure],
  })
  findDescendants(@Param('id') id: string) {
    return this.structuresService.findDescendants(id);
  }

  @Get(':id/ancestors')
  @ApiOperation({ summary: 'Get all ancestors of a structure' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of ancestor structures',
    type: [Structure],
  })
  findAncestors(@Param('id') id: string) {
    return this.structuresService.findAncestors(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a structure' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The structure has been successfully updated.',
    type: Structure,
  })
  update(
    @Param('id') id: string,
    @Body() updateStructureDto: Partial<Structure>,
  ) {
    return this.structuresService.update(id, updateStructureDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a structure' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The structure has been successfully deleted.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.structuresService.remove(id);
  }
}
