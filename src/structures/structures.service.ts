import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Structure } from './entities/structure.entity';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class StructuresService {
  constructor(
    @InjectRepository(Structure)
    private structuresRepository: TreeRepository<Structure>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createStructureDto: Partial<Structure>): Promise<Structure> {
    const structure = this.structuresRepository.create(createStructureDto);
    const saved = await this.structuresRepository.save(structure);
    await this.clearStructureCache();
    return saved;
  }

  async findAll(): Promise<Structure[]> {
    const cachedStructures =
      await this.cacheManager.get<Structure[]>('all_structures');
    if (cachedStructures) {
      return cachedStructures;
    }

    const structures = await this.structuresRepository.findTrees();
    await this.cacheManager.set('all_structures', structures);
    return structures;
  }

  async findOne(id: string): Promise<Structure> {
    const cacheKey = `structure_${id}`;
    const cachedStructure = await this.cacheManager.get<Structure>(cacheKey);
    if (cachedStructure) {
      return cachedStructure;
    }

    const structure = await this.structuresRepository.findOne({
      where: { id },
    });
    if (!structure) {
      throw new NotFoundException(`Structure with ID "${id}" not found`);
    }

    await this.cacheManager.set(cacheKey, structure);
    return structure;
  }

  async findDescendants(id: string): Promise<Structure[]> {
    const cacheKey = `structure_descendants_${id}`;
    const cachedDescendants =
      await this.cacheManager.get<Structure[]>(cacheKey);
    if (cachedDescendants) {
      return cachedDescendants;
    }

    const structure = await this.findOne(id);
    const descendants =
      await this.structuresRepository.findDescendants(structure);
    await this.cacheManager.set(cacheKey, descendants);
    return descendants;
  }

  async findAncestors(id: string): Promise<Structure[]> {
    const cacheKey = `structure_ancestors_${id}`;
    const cachedAncestors = await this.cacheManager.get<Structure[]>(cacheKey);
    if (cachedAncestors) {
      return cachedAncestors;
    }

    const structure = await this.findOne(id);
    const ancestors = await this.structuresRepository.findAncestors(structure);
    await this.cacheManager.set(cacheKey, ancestors);
    return ancestors;
  }

  async update(
    id: string,
    updateStructureDto: Partial<Structure>,
  ): Promise<Structure> {
    const structure = await this.findOne(id);
    Object.assign(structure, updateStructureDto);
    const updated = await this.structuresRepository.save(structure);
    await this.clearStructureCache();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const structure = await this.findOne(id);
    await this.structuresRepository.remove(structure);
    await this.clearStructureCache();
  }

  async findUserAccessibleStructures(
    userId: string,
    userStructureId: string,
  ): Promise<Structure[]> {
    const cacheKey = `user_accessible_structures_${userId}_${userStructureId}`;
    const cachedStructures = await this.cacheManager.get<Structure[]>(cacheKey);
    if (cachedStructures) {
      return cachedStructures;
    }

    const userStructure = await this.findOne(userStructureId);
    const accessibleStructures =
      await this.structuresRepository.findDescendants(userStructure);
    await this.cacheManager.set(cacheKey, accessibleStructures);
    return accessibleStructures;
  }

  private async clearStructureCache(): Promise<void> {
    await this.cacheManager.del('all_structures');
    // You might want to implement more sophisticated cache clearing
    // based on your specific needs
  }
}
