import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  message: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
