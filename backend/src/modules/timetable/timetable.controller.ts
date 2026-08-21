import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Timetable')
@ApiBearerAuth()
@Controller('timetable')
@UseGuards(RolesGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post('slots')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.HOD)
  async createTimetableSlot(@Body() dto: CreateTimetableSlotDto) {
    return this.timetableService.createTimetableSlot(dto);
  }

  @Public()
  @Get('slots')
  async findAllTimetableSlots() {
    return this.timetableService.findAllTimetableSlots();
  }

  @Public()
  @Get('slots/:id')
  async findOneTimetableSlot(@Param('id') id: string) {
    return this.timetableService.findOneTimetableSlot(id);
  }
}
