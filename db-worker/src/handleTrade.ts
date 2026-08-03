import type { trade } from ".";
import { prisma } from "@db/prismaClient";


async function HandleTrade(trade: trade) {
    try {
        const { symbol, price, quantity } = trade
        const newTrade = await prisma.trade.create({
            data: {
                symbol,
                price,
                quantity
            }
        })
        console.log("trade stored in db")
    } catch (e) {
        console.log("error saving trade in db", e)
    }

}

export default HandleTrade