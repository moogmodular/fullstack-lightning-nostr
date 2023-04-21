// import { PrismaClient } from '@prisma/client'
//
// const globalForPrisma = globalThis as unknown as {
//     prisma: PrismaClient | undefined
// }
//
// export const prisma =
//     globalForPrisma.prisma ??
//     new PrismaClient({
//         log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
//     })
//
// if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


import { PrismaClient } from "@prisma/client";

// declare global {
//     var db: PrismaClient | undefined;
// }
//
// global.db = global.db || new PrismaClient();

export const db = new PrismaClient();
