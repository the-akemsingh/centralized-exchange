import HandleTrade from "./handleTrade";
import { RedisManager } from "./redisManager";

const redisClient = RedisManager.getInstance();

console.log("DB worker is running")

export type trade = {
    symbol: string,
    price: number,
    quantity: number
}
while (1) {
    try {
        const receivedTrade = await redisClient.getTrades();
        if (!receivedTrade) {
            continue;
        }

        console.log("trade recived, storing in db")
        const parsedTrade: trade = JSON.parse(receivedTrade);

        HandleTrade(parsedTrade);
    } catch (e) {
        console.log("Error in engine:", e);
    }
}