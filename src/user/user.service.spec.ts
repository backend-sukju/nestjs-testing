import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { Prisma } from '@prisma/client';

import { User } from '@prisma/client';

const userFactory = Factory.define<Prisma.UserCreateInput>(() => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
}));

describe('UserService', () => {
  let service: UserService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user with factory data', async () => {
      const userData = userFactory.build();
      const expectedUser: User = {
        id: 1,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'create').mockResolvedValue(expectedUser);

      const result = await service.create(userData);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });
      expect(result).toEqual(expectedUser);
    });

    it('should create user with custom email using factory', async () => {
      const userData = userFactory.build({
        email: 'custom@test.com',
      });
      const expectedUser: User = {
        id: 1,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'create').mockResolvedValue(expectedUser);

      const result = await service.create(userData);

      expect(result.email).toBe('custom@test.com');
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });
  });

  describe('findAll', () => {
    it('should return all users with posts', async () => {
      const userData = userFactory.buildList(3);
      const mockUsers: User[] = userData.map((user, i) => ({
        id: i + 1,
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        include: { posts: true },
      });
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no users exist', async () => {
      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return user by id with posts', async () => {
      const userData = userFactory.build();
      const mockUser: User = {
        id: 1,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { posts: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user data', async () => {
      const userData = userFactory.build();
      const updatedUser: User = {
        id: 1,
        ...userData,
        name: 'Updated Name',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);

      const result = await service.update(1, { name: 'Updated Name' });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Name' },
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      const userData = userFactory.build();
      const deletedUser: User = {
        id: 1,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'delete').mockResolvedValue(deletedUser);

      const result = await service.remove(1);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(deletedUser);
    });
  });

  describe('Factory patterns in unit tests', () => {
    it('should handle edge cases with factory', async () => {
      const longNameUser = userFactory.build({
        name: 'A'.repeat(255),
      });
      const mockUser: User = {
        id: 1,
        ...longNameUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'create').mockResolvedValue(mockUser);

      const result = await service.create(longNameUser);

      expect(result.name).toHaveLength(255);
    });

    it('should create users with random data', async () => {
      const users = userFactory.buildList(3);
      const mockUsers: User[] = users.map((user, i) => ({
        id: i + 1,
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValueOnce(mockUsers[0])
        .mockResolvedValueOnce(mockUsers[1])
        .mockResolvedValueOnce(mockUsers[2]);

      const results = await Promise.all(
        users.map((user) => service.create(user)),
      );

      expect(results).toHaveLength(3);
      expect(results[0].email).not.toBe(results[1].email);
      expect(prismaService.user.create).toHaveBeenCalledTimes(3);
    });

    it('should test with specific user scenarios', async () => {
      const adminUser = userFactory.build({
        email: 'admin@company.com',
        name: 'System Administrator',
      });
      const mockAdminUser: User = {
        id: 1,
        ...adminUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'create').mockResolvedValue(mockAdminUser);

      const result = await service.create(adminUser);

      expect(result.email).toBe('admin@company.com');
      expect(result.name).toBe('System Administrator');
    });
  });
});
