import { RelayPool } from 'nostr-relaypool'
import 'isomorphic-fetch'
import { Event, finishEvent, getPublicKey, Kind, nip04, nip19 } from 'nostr-tools'
import { PrismaClient } from '@nostr-bot/prisma'

export const doWeather = async (
    event: Event,
    prisma: PrismaClient,
    relays: string[],
    relayPool: RelayPool,
    args: string[],
    mention?: boolean,
) => {
    const botNsecHex = nip19.decode(`${process.env.BOT_NOSTR_NSEC}`).data.toString()
    const botNpubHex = getPublicKey(botNsecHex)

    const targetCity = (await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${args[0]}&count=3&language=en&format=json`,
    ).then((res) => res.json())) as { results: { latitude: number; longitude: number }[] }

    const lat = targetCity.results[0].latitude.toFixed(2)
    const lon = targetCity.results[0].longitude.toFixed(2)

    const weather = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m`,
    ).then((res) => res.json())

    const message = `The temperature in ${args[0]} is ${weather['hourly']['temperature_2m'][0]}°C`

    const ciphertext = await nip04.encrypt(botNsecHex, event.pubkey, message)

    const unsignedEvent = {
        kind: mention ? Kind.Text : Kind.EncryptedDirectMessage,
        created_at: event.created_at + 1,
        tags: mention ? [['e', event.id, '', 'root']] : [['p', event.pubkey]],
        content: mention ? message : ciphertext,
        pubkey: botNpubHex,
    }

    const finishedEvent = finishEvent(unsignedEvent, botNsecHex)

    relayPool.publish(finishedEvent, relays)

    return finishedEvent
}
export const doHelp = async (
    event: Event,
    prisma: PrismaClient,
    relays: string[],
    relayPool: RelayPool,
    args: string[],
    mention?: boolean,
) => {
    const botNsecHex = nip19.decode(`${process.env.BOT_NOSTR_NSEC}`).data.toString()
    const botNpubHex = getPublicKey(botNsecHex)

    const message = `Hello user! I am a bot. I can do the following things:

    I'm either reachable via direct message or via a mention eg. @open200NostrBot

    - weather.city or @open200NostrBot weather.city - get the weather in a city
    - price.coin or @open200NostrBot - get the price of a coin
    - help or @open200NostrBot - get this message`

    const ciphertext = await nip04.encrypt(botNsecHex, event.pubkey, message)

    const unsignedEvent = {
        kind: mention ? Kind.Text : Kind.EncryptedDirectMessage,
        created_at: event.created_at + 1,
        tags: mention ? [['e', event.id, '', 'root']] : [['p', event.pubkey]],
        content: mention ? message : ciphertext,
        pubkey: botNpubHex,
    }

    const finishedEvent = finishEvent(unsignedEvent, botNsecHex)

    relayPool.publish(finishedEvent, relays)
}

export const doPrice = async (
    event: Event,
    prisma: PrismaClient,
    relays: string[],
    relayPool: RelayPool,
    args: string[],
    mention?: boolean,
) => {
    const botNsecHex = nip19.decode(`${process.env.BOT_NOSTR_NSEC}`).data.toString()
    const botNpubHex = getPublicKey(botNsecHex)

    const price = (await fetch('https://api.kucoin.com/api/v1/market/stats?symbol=BTC-USDT').then((res) =>
        res.json(),
    )) as { data: { buy: string } }

    const message = `Hello user! The price of BTC is ${price.data.buy}`

    const ciphertext = await nip04.encrypt(botNsecHex, event.pubkey, message)

    const unsignedEvent = {
        kind: mention ? Kind.Text : Kind.EncryptedDirectMessage,
        created_at: event.created_at + 1,
        tags: mention ? [['e', event.id, '', 'root']] : [['p', event.pubkey]],
        content: mention ? message : ciphertext,
        pubkey: botNpubHex,
    }

    const finishedEvent = finishEvent(unsignedEvent, botNsecHex)

    relayPool.publish(finishedEvent, relays)
}
