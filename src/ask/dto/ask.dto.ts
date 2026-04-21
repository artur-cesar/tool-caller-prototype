import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

import { AskMode } from '../ask-mode.enum';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  message: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsEnum(AskMode)
  mode?: AskMode;
}
