import { type PrismaClient } from '@fln/db'
import { type RelayPool } from 'nostr-relaypool'
import { type Event, finishEvent, getPublicKey, Kind, nip04, nip19 } from 'nostr-tools'

export const doAdminMessage = async (
    event: Event,
    prisma: PrismaClient,
    relays: string[],
    relayPool: RelayPool,
    args: string[],
    message?: string,
) => {
    const botNsecHex = nip19.decode(`${process.env.BOT_NOSTR_NSEC}`).data.toString()
    const botNpubHex = getPublicKey(botNsecHex)

    const adminNsecHex = nip19.decode(`${process.env.ADMIN_NOSTR_NSEC}`).data.toString()
    const adminNpubHex = getPublicKey(adminNsecHex)

    const ciphertext = await nip04.encrypt(botNsecHex, adminNpubHex, message ?? 'no message, something went wrong')

    const unsignedEvent = {
        kind: Kind.EncryptedDirectMessage,
        created_at: event.created_at + 1,
        tags: [['p', adminNpubHex]],
        content: ciphertext,
        pubkey: botNpubHex,
    }

    const finishedEvent = finishEvent(unsignedEvent, botNsecHex)

    relayPool.publish(finishedEvent, relays)

    console.log('admin message sent')

    return finishedEvent
}

export const doGenericMessage = async (
    event: Event,
    prisma: PrismaClient,
    relays: string[],
    relayPool: RelayPool,
    args: string[],
    message?: string,
) => {
    const botNsecHex = nip19.decode(`${process.env.BOT_NOSTR_NSEC}`).data.toString()
    const botNpubHex = getPublicKey(botNsecHex)

    const ciphertext = await nip04.encrypt(botNsecHex, event.pubkey, message ?? 'no message, something went wrong')

    const unsignedEvent = {
        kind: Kind.EncryptedDirectMessage,
        created_at: event.created_at + 1,
        tags: [['p', event.pubkey]],
        content: ciphertext,
        pubkey: botNpubHex,
    }

    const finishedEvent = finishEvent(unsignedEvent, botNsecHex)

    relayPool.publish(finishedEvent, relays)

    console.log('admin message sent')

    return finishedEvent
}
