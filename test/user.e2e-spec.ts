import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { userFactory, postFactory } from './factories';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('/users (POST)', () => {
    it('should create a new user', async () => {
      const userData = userFactory.build();

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        email: userData.email,
        name: userData.name,
      });
      expect(response.body.id).toBeDefined();
    });

    it('should fail with duplicate email', async () => {
      const userData = userFactory.build({ email: 'duplicate@test.com' });

      await request(app.getHttpServer())
        .post('/users')
        .send(userData)
        .expect(201);

      await request(app.getHttpServer())
        .post('/users')
        .send(userData)
        .expect(500);
    });
  });

  describe('/users (GET)', () => {
    it('should return empty array when no users exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all users with their posts', async () => {
      const user1 = await prisma.user.create({
        data: userFactory.build(),
      });

      const user2 = await prisma.user.create({
        data: userFactory.build(),
      });

      await prisma.post.create({
        data: postFactory.build({
          author: { connect: { id: user1.id } },
        }),
      });

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].posts).toBeDefined();
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return user by id', async () => {
      const user = await prisma.user.create({
        data: userFactory.build(),
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    });

    it('should return empty object for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/999')
        .expect(200);

      expect(response.body).toEqual({});
    });
  });

  describe('/users/:id (PATCH)', () => {
    it('should update user', async () => {
      const user = await prisma.user.create({
        data: userFactory.build(),
      });

      const updateData = { name: 'Updated Name' };

      const response = await request(app.getHttpServer())
        .patch(`/users/${user.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should delete user', async () => {
      const user = await prisma.user.create({
        data: userFactory.build(),
      });

      await request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .expect(200);

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deletedUser).toBeNull();
    });
  });

  describe('Factory usage examples', () => {
    it('should create user with custom data using factory', async () => {
      const customUserData = userFactory.build({
        email: 'test@example.com',
        name: 'Test User',
      });

      const user = await prisma.user.create({
        data: customUserData,
      });

      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
    });

    it('should create multiple users using factory', async () => {
      const usersData = userFactory.buildList(3);

      for (const userData of usersData) {
        await prisma.user.create({ data: userData });
      }

      const users = await prisma.user.findMany();
      expect(users).toHaveLength(3);
    });

    it('should create user with posts using factories', async () => {
      const user = await prisma.user.create({
        data: userFactory.build(),
      });

      const postsData = postFactory.buildList(2, {
        author: { connect: { id: user.id } },
      });

      for (const postData of postsData) {
        await prisma.post.create({ data: postData });
      }

      const userWithPosts = await prisma.user.findUnique({
        where: { id: user.id },
        include: { posts: true },
      });

      expect(userWithPosts!.posts).toHaveLength(2);
    });
  });
});
