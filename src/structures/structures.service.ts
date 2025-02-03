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

    // Get all structures
    const structures = await this.structuresRepository.find({
      relations: ['children', 'parent'],
      order: {
        level: 'ASC',
      },
    });

    // Build the tree structure
    const structureMap = new Map<string, Structure>();
    const rootStructures: Structure[] = [];

    // First pass: Create a map of all structures
    structures.forEach((structure) => {
      structureMap.set(structure.id, {
        ...structure,
        children: [],
      });
    });

    // Second pass: Build the tree
    structures.forEach((structure) => {
      const currentStructure = structureMap.get(structure.id);
      if (structure.parentId) {
        const parent = structureMap.get(structure.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(currentStructure);
        }
      } else {
        rootStructures.push(currentStructure);
      }
    });

    await this.cacheManager.set('all_structures', rootStructures);
    return rootStructures;
  }

  private async loadChildren(structure: Structure): Promise<void> {
    const children = await this.structuresRepository.find({
      relations: ['children'],
      where: { parentId: structure.id },
    });

    if (children.length > 0) {
      structure.children = children;
      for (const child of children) {
        await this.loadChildren(child);
      }
    }
  }

  async findOne(id: string): Promise<Structure> {
    const cacheKey = `structure_${id}`;
    const cachedStructure = await this.cacheManager.get<Structure>(cacheKey);
    if (cachedStructure) {
      return cachedStructure;
    }

    const structure = await this.structuresRepository.findOne({
      where: { id },
      relations: ['children', 'parent'],
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
    // TODO: implement more robust cache clearing
    // based on specific needs
  }
}
