import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  // Building Methods
  async createBuilding(dto: CreateBuildingDto) {
    const existing = await this.prisma.building.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Building code ${dto.code} already exists`);
    }

    return this.prisma.building.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        campusName: dto.campusName,
        totalFloors: dto.totalFloors,
      },
    });
  }

  async findAllBuildings() {
    return this.prisma.building.findMany({
      include: {
        rooms: true,
      },
    });
  }

  async findOneBuilding(id: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        rooms: true,
      },
    });
    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }
    return building;
  }

  // Room Methods
  async createRoom(dto: CreateRoomDto) {
    const building = await this.findOneBuilding(dto.buildingId);

    const existingCode = await this.prisma.room.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existingCode) {
      throw new ConflictException(`Room code ${dto.code} already exists`);
    }

    if (dto.hasComputers === false && dto.computerCount && dto.computerCount > 0) {
      throw new BadRequestException('computerCount must be 0 when hasComputers is false');
    }

    return this.prisma.room.create({
      data: {
        buildingId: dto.buildingId,
        code: dto.code.toUpperCase(),
        roomNumber: dto.roomNumber,
        name: dto.name,
        type: dto.type as any ?? 'LECTURE_HALL',
        capacity: dto.capacity,
        floorLevel: dto.floorLevel ?? 0,
        isAccessible: dto.isAccessible ?? false,
        hasProjector: dto.hasProjector ?? false,
        hasComputers: dto.hasComputers ?? false,
        computerCount: dto.computerCount ?? 0,
        hasLabEquipment: dto.hasLabEquipment ?? false,
      },
      include: {
        building: true,
      },
    });
  }

  async findAllRooms() {
    return this.prisma.room.findMany({
      include: {
        building: true,
      },
    });
  }

  async findOneRoom(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        building: true,
      },
    });
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return room;
  }
}
