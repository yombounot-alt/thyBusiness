import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const BUSINESS_TYPES = [
  'commerce',
  'restaurant',
  'services',
  'pharmacie',
  'mode',
  'electronique',
  'alimentation',
  'autre',
] as const;

export class CreateBusinessDto {
  @ApiProperty({ example: 'Boutique Demo' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: BUSINESS_TYPES })
  @IsIn(BUSINESS_TYPES)
  businessType!: (typeof BUSINESS_TYPES)[number];

  @ApiPropertyOptional({ example: 'GNF', default: 'GNF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '+224600000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Kaloum, Conakry' })
  @IsOptional()
  @IsString()
  address?: string;
}
