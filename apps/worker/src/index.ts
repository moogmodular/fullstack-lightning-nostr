import { doAdminMessage, doGenericMessage } from './admin-service'
import { doHelp, doPrice, doWeather } from './private-message-service'
import { prisma, type PrismaClient } from '@nostr-bot/db'
import { webcrypto } from 'crypto'
import { format } from 'date-fns'
import { config as dotenvConfig } from 'dotenv'
import express from 'express'
import { schedule } from 'node-cron'
import { RelayPool } from 'nostr-relaypool'
import { type Event, getPublicKey, Kind, nip04, nip19 } from 'nostr-tools'
import * as process from 'process'

globalThis.crypto = webcrypto as unknown as Crypto

dotenvConfig({ path: '../../.env' })

const startCron = () => {
    console.log('START CRON')
    schedule('10 * * * * *', () => {
        console.log(`running a task 10 * * * * * --- ${format(new Date(), 'hh:mm:ss')}`)
    })
}

const subscriptionBase = async () => {
    const relays = await prisma.relay.findMany().then((res: any) => res.map((r: any) => r.url))
    const relayPool = new RelayPool(relays)

    const botNsecHex = nip19.decode(`${process.env.BOT_NOSTR_NSEC}`).data.toString()
    const botNpubHex = getPublicKey(botNsecHex)

    const serverStartNow = Math.floor(Date.now() / 1000)
    return { relays, relayPool, botNsecHex, botNpubHex, serverStartNow }
}

type BotFunctions = 'help' | 'weather' | 'price'

const getContent = (content: string) => {
    const contentArgs = content
        .split('.')
        .map((c: string) => c.trim())
        .map((c: string) => c.toLowerCase())

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
            const localKind = event.kind
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

const app = express()
const port = 3333

app.get('/', async (req, res) => {
    const users = await prisma.user.findMany()
    console.log(users)
    res.json(users)
})

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
})
