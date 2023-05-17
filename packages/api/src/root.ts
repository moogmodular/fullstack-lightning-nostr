import { authRouter } from './router/auth'
import { postRouter } from './router/post'
import { relayRouter } from './router/relay'
import { createTRPCRouter } from './trpc'

export const appRouter = createTRPCRouter({
    post: postRouter,
    auth: authRouter,
    relay: relayRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
