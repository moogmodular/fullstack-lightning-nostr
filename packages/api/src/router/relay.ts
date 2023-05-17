import { createTRPCRouter, publicProcedure } from '../trpc'
import { addTwoNumbers } from '@fln/common'

export const relayRouter = createTRPCRouter({
    list: publicProcedure.query(async ({ ctx }) => {
        addTwoNumbers(1, 2)
        const relayList = await ctx.prisma.relay.findMany()
        console.log('relayList', relayList)
        const helloTest = addTwoNumbers(1, 2)
        console.log('helloTest', helloTest)
        return { relayList }
    }),
})
