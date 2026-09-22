import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: '+224600000001' })
  @IsPhoneNumber(undefined, {
    message: 'Numéro de téléphone invalide (format international requis).',
  })
  phone!: string;

  @ApiProperty({ minLength: 8, example: 'MotDePasse123!' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  password!: string;

  @ApiProperty({ example: 'Tamba Camara' })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiPropertyOptional({ example: 'tamba@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
