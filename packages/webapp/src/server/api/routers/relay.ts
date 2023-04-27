import { createTRPCRouter, publicProcedure } from '../trpc'

export const relayRouter = createTRPCRouter({
    list: publicProcedure.query(async ({ ctx }) => {
        const relayList = await ctx.prisma.relay.findMany()
        console.log('relayList', relayList)
        return { relayList }
    }),
})
