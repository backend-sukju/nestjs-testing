import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../src/user/user.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { userFactory } from './factories';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, PrismaService],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('should create a new user using factory', async () => {
      const userData = userFactory.build();
      const user = await service.create(userData);

      expect(user).toMatchObject({
        email: userData.email,
        name: userData.name,
      });
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });

    it('should create user with custom email using factory', async () => {
      const userData = userFactory.build({
        email: 'custom@test.com',
      });

      const user = await service.create(userData);
      expect(user.email).toBe('custom@test.com');
    });
  });

  describe('findAll', () => {
    it('should return empty array when no users exist', async () => {
      const users = await service.findAll();
      expect(users).toEqual([]);
    });

    it('should return all users created with factory', async () => {
      const userData1 = userFactory.build();
      const userData2 = userFactory.build();

      await service.create(userData1);
      await service.create(userData2);

      const users = await service.findAll();
      expect(users).toHaveLength(2);
    });

    it('should create multiple users using buildList', async () => {
      const usersData = userFactory.buildList(5);

      for (const userData of usersData) {
        await service.create(userData);
      }

      const users = await service.findAll();
      expect(users).toHaveLength(5);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const userData = userFactory.build();
      const createdUser = await service.create(userData);

      const foundUser = await service.findOne(createdUser.id);
      expect(foundUser).toMatchObject(createdUser);
    });

    it('should return null for non-existent user', async () => {
      const user = await service.findOne(999);
      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user data', async () => {
      const userData = userFactory.build();
      const createdUser = await service.create(userData);

      const updatedUser = await service.update(createdUser.id, {
        name: 'Updated Name',
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.email).toBe(createdUser.email);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      const userData = userFactory.build();
      const createdUser = await service.create(userData);

      await service.remove(createdUser.id);

      const deletedUser = await service.findOne(createdUser.id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Factory examples', () => {
    it('should demonstrate factory with associations', async () => {
      const userWithSpecificData = userFactory.build({
        email: 'specific@example.com',
        name: 'Specific User',
      });

      const user = await service.create(userWithSpecificData);

      expect(user.email).toBe('specific@example.com');
      expect(user.name).toBe('Specific User');
    });

    it('should create users with random data', async () => {
      const users = await Promise.all([
        service.create(userFactory.build()),
        service.create(userFactory.build()),
        service.create(userFactory.build()),
      ]);

      expect(users).toHaveLength(3);
      expect(users[0].email).not.toBe(users[1].email);
      expect(users[1].email).not.toBe(users[2].email);
    });
  });
});
