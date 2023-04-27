import { z } from 'zod'

import { createTRPCRouter, publicProcedure } from '../trpc'

export const exampleRouter = createTRPCRouter({
    hello: publicProcedure.input(z.object({ text: z.string() })).query(({ input }) => {
        return {
            greeting: `Hello ${input.text}`,
        }
    }),
    getAll: publicProcedure.query(({ ctx }) => {
        return ctx.prisma.relay.findMany()
    }),
    getHello: publicProcedure.query(({ ctx }) => {
        const testHello = ctx.prisma.relay.findMany()
        return { msg: JSON.stringify(testHello) ?? '' }
    }),
})
