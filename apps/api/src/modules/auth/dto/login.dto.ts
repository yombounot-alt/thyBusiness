import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '+224600000001' })
  @IsPhoneNumber(undefined, { message: 'Numéro de téléphone invalide.' })
  phone!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}
