import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  message: string;
}
