import {
  IsDecimal,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SubmitGradeDto {
  @ApiProperty({ description: 'Enrollment ID to grade' })
  @IsUUID()
  @IsNotEmpty()
  enrollmentId: string;

  @ApiProperty({
    description: 'Letter grade (e.g. A+, A, A-, B+, B, B-, C+, C, D, F, I, W)',
    example: 'A',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(A\+|A|A-|B\+|B|B-|C\+|C|D|F|I|W)$/, {
    message: 'letterGrade must be one of: A+, A, A-, B+, B, B-, C+, C, D, F, I, W',
  })
  letterGrade: string;

  @ApiProperty({ description: 'Grade points (e.g. 4.00, 3.67, 0.00)', example: 4.0 })
  @IsNotEmpty()
  @Type(() => Number)
  gradePoints: number;

  @ApiPropertyOptional({ description: 'Raw percentage score', example: 92.5 })
  @IsOptional()
  @Type(() => Number)
  percentageScore?: number;

  @ApiPropertyOptional({ description: 'Instructor remarks' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
