import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsPhoneNumber, Length } from 'class-validator';
import { OtpPurpose } from '../../otp/otp.service';

const PURPOSES: OtpPurpose[] = ['signup', 'login', 'password_reset'];

export class VerifyOtpDto {
  @ApiProperty({ example: '+224600000001' })
  @IsPhoneNumber(undefined, { message: 'Numéro de téléphone invalide.' })
  phone!: string;

  @ApiProperty({ enum: PURPOSES })
  @IsIn(PURPOSES)
  purpose!: OtpPurpose;

  @ApiProperty({ example: '123456' })
  @Length(6, 6, { message: 'Le code doit contenir 6 chiffres.' })
  code!: string;
}
