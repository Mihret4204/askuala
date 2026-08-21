import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '../../common/enums/role.enum';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // createUser
  // ---------------------------------------------------------------------------
  describe('createUser', () => {
    const dto = {
      email: 'Jane.Doe@Example.COM',
      password: 'secret123',
      firstName: 'Jane',
      lastName: 'Doe',
      role: UserRole.INSTRUCTOR,
    };

    it('should create a user and return safe fields only (no passwordHash)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'jane.doe@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'INSTRUCTOR',
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      const result = await service.createUser(dto);

      expect(result).toHaveProperty('id', 'user-1');
      expect(result).toHaveProperty('email', 'jane.doe@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should lowercase the email before saving', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'jane.doe@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'INSTRUCTOR',
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      await service.createUser(dto);

      // findUnique must be called with lowercased email
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'jane.doe@example.com' },
      });
      // create must receive lowercased email
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'jane.doe@example.com' }),
        }),
      );
    });

    it('should hash the password (not store plaintext)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'jane.doe@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'INSTRUCTOR',
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      await service.createUser(dto);

      const callData = (prisma.user.create as jest.Mock).mock.calls[0][0].data;
      // passwordHash must exist and must not equal the plaintext password
      expect(callData).toHaveProperty('passwordHash');
      expect(callData.passwordHash).not.toBe(dto.password);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-existing' });

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return all users with safe fields', async () => {
      const users = [
        {
          id: 'user-1',
          email: 'a@b.com',
          firstName: 'A',
          lastName: 'B',
          role: 'STUDENT',
          status: 'ACTIVE',
          createdAt: new Date(),
        },
        {
          id: 'user-2',
          email: 'c@d.com',
          firstName: 'C',
          lastName: 'D',
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
          createdAt: new Date(),
        },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'user-1');
      expect(result[0]).not.toHaveProperty('passwordHash');
    });

    it('should return an empty array when no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return a user by id including profile relations', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        role: 'STUDENT',
        status: 'ACTIVE',
        createdAt: new Date(),
        studentProfile: { id: 'student-1' },
        instructorProfile: null,
      });

      const result = await service.findOne('user-1');

      expect(result).toHaveProperty('id', 'user-1');
      expect(result).toHaveProperty('studentProfile');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
