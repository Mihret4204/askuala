import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Infrastructure')
@ApiBearerAuth()
@Controller('infrastructure')
@UseGuards(RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // Building Endpoints
  @Post('buildings')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async createBuilding(@Body() dto: CreateBuildingDto) {
    return this.roomsService.createBuilding(dto);
  }

  @Public()
  @Get('buildings')
  async findAllBuildings() {
    return this.roomsService.findAllBuildings();
  }

  @Public()
  @Get('buildings/:id')
  async findOneBuilding(@Param('id') id: string) {
    return this.roomsService.findOneBuilding(id);
  }

  // Room Endpoints
  @Post('rooms')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async createRoom(@Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(dto);
  }

  @Public()
  @Get('rooms')
  async findAllRooms() {
    return this.roomsService.findAllRooms();
  }

  @Public()
  @Get('rooms/:id')
  async findOneRoom(@Param('id') id: string) {
    return this.roomsService.findOneRoom(id);
  }
}
