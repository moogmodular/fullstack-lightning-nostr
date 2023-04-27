import { initTRPC } from '@trpc/server'
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { format } from 'date-fns'
import { config as dotenvConfig } from 'dotenv'

import cron from 'node-cron'
import { RelayPool } from 'nostr-relaypool'
import { Event, getPublicKey, Kind, nip04, nip19 } from 'nostr-tools'
import { doHelp, doPrice, doWeather } from './private-message-service'
import { doAdminMessage, doGenericMessage } from './admin-service'
import { PrismaClient } from '@nostr-bot/prisma'

export type AppRouter = typeof workerRouter

const prisma = new PrismaClient()

const t = initTRPC.create()

const publicProcedure = t.procedure
const router = t.router

dotenvConfig({ path: '../../.env' })

const workerRouter = router({
    greet: publicProcedure
        .input((val: unknown) => {
            if (typeof val === 'string') return val
            throw new Error(`Invalid input: ${typeof val}`)
        })
        .query(({ input }) => ({ greeting: `hello, ${input}!` })),
})

const startCron = () => {
    console.log('START CRON')
    cron.schedule('10 * * * * *', () => {
        console.log(`running a task 10 * * * * * --- ${format(new Date(), 'hh:mm:ss')}`)
    })
}

const subscriptionBase = async () => {
    const relays = await prisma.relay.findMany().then((res) => res.map((r) => r.url))
    const relayPool = new RelayPool(relays)

    const botNsecHex = nip19.decode(`${process.env.BOT_NOSTR_NSEC}`).data.toString()
    const botNpubHex = getPublicKey(botNsecHex)

    const serverStartNow = Math.floor(Date.now() / 1000)
    return { relays, relayPool, botNsecHex, botNpubHex, serverStartNow }
}

type BotFunctions = 'help' | 'weather' | 'price'

function getContent(content) {
    const contentArgs = content
        .split('.')
        .map((c) => c.trim())
        .map((c) => c.toLowerCase())

    const botFunction = contentArgs[0] as BotFunctions
    return { contentArgs, botFunction }
}

const startSubscriptions = async () => {
    startCron()

    const { relays, relayPool, botNsecHex, botNpubHex, serverStartNow } = await subscriptionBase()

    const doMention = async (event: Event) => {
        const content = event.content.split(' ')[1]
        console.log('-------------  Mention message received', content)
        const { contentArgs, botFunction } = getContent(content)

        const doError = async (
            event: Event,
            prisma: PrismaClient,
            relays: string[],
            relayPool: RelayPool,
            args: string[],
        ) => {
            const decodedContent = await nip04.decrypt(botNsecHex, event.pubkey, event.content)
            await doAdminMessage(
                event,
                prisma,
                relays,
                relayPool,
                args,
                `unknown command or error:\n---\n${decodedContent}\n---\nEVENT: ${JSON.stringify(event)}`,
            )
            await doGenericMessage(
                event,
                prisma,
                relays,
                relayPool,
                args,
                `the command ${decodedContent} is not recognized. Please try again.`,
            )
        }

        const callBotFunction =
            {
                help: doHelp,
                weather: doWeather,
                price: doPrice,
            }[botFunction] ?? doError
        await callBotFunction(event, prisma, relays, relayPool, [...contentArgs.slice(1)], true)
    }

    const doPrivateMessage = async (event: Event) => {
        const content = await nip04.decrypt(botNsecHex, event.pubkey, event.content)
        console.log('------------- Private message received', content)
        const contentArgs = content
            .split('.')
            .map((c) => c.trim())
            .map((c) => c.toLowerCase())
        const botFunction = contentArgs[0] as BotFunctions

        const doError = async (
            event: Event,
            prisma: PrismaClient,
            relays: string[],
            relayPool: RelayPool,
            args: string[],
        ) => {
            const decodedContent = await nip04.decrypt(botNsecHex, event.pubkey, event.content)
            await doAdminMessage(
                event,
                prisma,
                relays,
                relayPool,
                args,
                `unknown command or error:\n---\n${decodedContent}\n---\nEVENT: ${JSON.stringify(event)}`,
            )
            await doGenericMessage(
                event,
                prisma,
                relays,
                relayPool,
                args,
                `the command ${decodedContent} is not recognized. Please try again.`,
            )
        }

        const callBotFunction =
            {
                help: doHelp,
                weather: doWeather,
                price: doPrice,
            }[botFunction] ?? doError
        await callBotFunction(event, prisma, relays, relayPool, [...contentArgs.slice(1)])
    }

    const unsubscribe = relayPool.subscribe(
        [
            {
                '#p': [botNpubHex],
                kinds: [Kind.Text, Kind.EncryptedDirectMessage],
                since: serverStartNow,
            },
        ],
        relays,
        (event, isAfterEose, relayURL) => {
            const localKind = event.kind as Kind.Text | Kind.EncryptedDirectMessage
            const eventFunction = {
                1: doMention,
                4: doPrivateMessage,
            }[localKind]
            void eventFunction(event)
        },
        undefined,
        (events, relayURL) => {
            console.log(events)
        },
    )
}

void startSubscriptions()

createHTTPServer({
    router: workerRouter,
    createContext() {
        return {}
    },
}).listen(2022)
