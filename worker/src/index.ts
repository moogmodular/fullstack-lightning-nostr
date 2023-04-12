import { initTRPC } from '@trpc/server'
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import cron from 'node-cron'
import { format } from 'date-fns'
import dotenv from 'dotenv'

import { RelayPool } from 'nostr-relaypool'
import fetch from 'node-fetch'
import { finishEvent, getPublicKey, Kind } from 'nostr-tools'

export type AppRouter = typeof appRouter

const t = initTRPC.create()

const publicProcedure = t.procedure
const router = t.router

dotenv.config({ path: '../.env' })

const relays = [
    'wss://relay.damus.io',
    'wss://offchain.pub',
    'wss://nostr.wine',
    'wss://nostr-pub.wellorder.net',
    'wss://relay.nostr.info',
    'wss://nostr.bitcoiner.social',
    'wss://nostr.oxtr.dev',
    'wss://nostr.fmt.wiz.biz',
    'wss://relay.snort.social',
]

const appRouter = router({
    greet: publicProcedure
        .input((val: unknown) => {
            if (typeof val === 'string') return val
            throw new Error(`Invalid input: ${typeof val}`)
        })
        .query(({ input }) => ({ greeting: `hello, ${input}!` })),
})

const startSubscriptions = () => {
    const relayPool = new RelayPool(relays)

    const publicKey = getPublicKey(`${process.env.BOT_NOSTR_PRIVATE_KEY}`)
    console.log('publicKey', publicKey)
    const unsubscribe = relayPool.subscribe(
        [
            {
                '#p': [publicKey],
                kinds: [Kind.Text],
                since: new Date().getTime() / 1000,
            },
        ],
        relays,
        (event, isAfterEose, relayURL) => {
            console.log('event', event)
            const doEvent = async () => {
                const privateKey = `${process.env.BOT_NOSTR_PRIVATE_KEY}`
                const publicKey = getPublicKey(privateKey)

                const price = (await fetch('https://api.kucoin.com/api/v1/market/stats?symbol=BTC-USDT').then((res) =>
                    res.json(),
                )) as { data: { buy: string } }

                const unsignedEvent = {
                    kind: 1,
                    created_at: Math.floor(Date.now() / 1000),
                    tags: [['e', event.id, '', 'root']],
                    content: `Good morning ser,\nthe current price of BTC in USD is: \n ${price.data.buy}`,
                    pubkey: publicKey,
                }

                return finishEvent(unsignedEvent, privateKey)
            }
            void doEvent()
        },
        undefined,
        (events, relayURL) => {
            console.log(events)
        },
    )
}

const startCron = () => {
    console.log('START CRON')
    cron.schedule('30 * * * * *', () => {
        console.log(`running a task every minute --- ${format(new Date(), 'hh:mm:ss')}`)
    })
}

startCron()
startSubscriptions()

createHTTPServer({
    router: appRouter,
    createContext() {
        return {}
    },
}).listen(2022)
