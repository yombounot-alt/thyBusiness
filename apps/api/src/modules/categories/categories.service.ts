import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: { businessId, name: dto.name },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Une catégorie porte déjà ce nom.');
      }
      throw error;
    }
  }

  findAll(businessId: string) {
    return this.prisma.category.findMany({ where: { businessId }, orderBy: { name: 'asc' } });
  }

  async findOne(businessId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, businessId } });
    if (!category) {
      throw new NotFoundException('Catégorie introuvable.');
    }
    return category;
  }

  async update(businessId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(businessId, id);
    try {
      return await this.prisma.category.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Une catégorie porte déjà ce nom.');
      }
      throw error;
    }
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.findOne(businessId, id);
    await this.prisma.category.delete({ where: { id } });
  }
}
