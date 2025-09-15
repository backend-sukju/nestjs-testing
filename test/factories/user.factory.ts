import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { Prisma } from '@prisma/client';

export const userFactory = Factory.define<Prisma.UserCreateInput>(() => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
}));
