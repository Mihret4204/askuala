import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../../database/prisma.service';

describe('RoomsService', () => {
  let service: RoomsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    building: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    room: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBuilding', () => {
    it('should create a building successfully', async () => {
      const dto = { code: 'ENG', name: 'Engineering Block A', campusName: 'Main Campus' };

      mockPrismaService.building.findUnique.mockResolvedValue(null);
      mockPrismaService.building.create.mockResolvedValue({ id: 'bld-1', ...dto });

      const result = await service.createBuilding(dto);
      expect(result).toHaveProperty('id', 'bld-1');
    });

    it('should throw ConflictException if building code exists', async () => {
      const dto = { code: 'ENG', name: 'Engineering Block A', campusName: 'Main Campus' };

      mockPrismaService.building.findUnique.mockResolvedValue({ id: 'bld-1' });

      await expect(service.createBuilding(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('createRoom', () => {
    it('should create a room successfully', async () => {
      const dto = {
        buildingId: 'bld-1',
        code: 'ENG-201',
        roomNumber: '201',
        capacity: 50,
      };

      mockPrismaService.building.findUnique.mockResolvedValue({ id: 'bld-1' });
      mockPrismaService.room.findUnique.mockResolvedValue(null);
      mockPrismaService.room.create.mockResolvedValue({ id: 'room-1', ...dto });

      const result = await service.createRoom(dto);
      expect(result).toHaveProperty('id', 'room-1');
    });

    it('should throw BadRequestException if computerCount > 0 when hasComputers is false', async () => {
      const dto = {
        buildingId: 'bld-1',
        code: 'ENG-201',
        roomNumber: '201',
        capacity: 50,
        hasComputers: false,
        computerCount: 10,
      };

      mockPrismaService.building.findUnique.mockResolvedValue({ id: 'bld-1' });
      mockPrismaService.room.findUnique.mockResolvedValue(null);

      await expect(service.createRoom(dto)).rejects.toThrow(BadRequestException);
    });
  });
});
