import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { Prisma } from '@prisma/client';

export const postFactory = Factory.define<Prisma.PostCreateInput>(
  ({ associations }) => ({
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    published: faker.datatype.boolean(),
    author: associations.author || {
      connect: { id: 1 },
    },
  }),
);
