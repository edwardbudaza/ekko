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
} from '@nestjs/common';
import { StructuresService } from './structures.service';
import { Structure } from './entities/structure.entity';

@Controller('structures')
export class StructuresController {
  constructor(private readonly structuresService: StructuresService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createStructureDto: Partial<Structure>) {
    return this.structuresService.create(createStructureDto);
  }

  @Get()
  findAll() {
    return this.structuresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.structuresService.findOne(id);
  }

  @Get(':id/descendants')
  findDescendants(@Param('id') id: string) {
    return this.structuresService.findDescendants(id);
  }

  @Get(':id/ancestors')
  findAncestors(@Param('id') id: string) {
    return this.structuresService.findAncestors(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateStructureDto: Partial<Structure>,
  ) {
    return this.structuresService.update(id, updateStructureDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.structuresService.remove(id);
  }
}
