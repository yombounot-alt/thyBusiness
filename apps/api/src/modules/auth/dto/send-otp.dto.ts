import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsPhoneNumber } from 'class-validator';
import { OtpPurpose } from '../../otp/otp.service';

const PURPOSES: OtpPurpose[] = ['signup', 'login', 'password_reset'];

export class SendOtpDto {
  @ApiProperty({ example: '+224600000001' })
  @IsPhoneNumber(undefined, { message: 'Numéro de téléphone invalide.' })
  phone!: string;

  @ApiProperty({ enum: PURPOSES })
  @IsIn(PURPOSES)
  purpose!: OtpPurpose;
}
