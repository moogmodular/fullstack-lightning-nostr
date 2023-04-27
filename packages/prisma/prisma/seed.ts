import { PrismaClient } from '@prisma/client'
import { relays } from './seed-data/relays'

const prisma = new PrismaClient()

async function main() {
    await Promise.all(relays.map((relay) => prisma.relay.create({ data: { url: relay } })))
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
