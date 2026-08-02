import handleOrder from "./handleOrder";
import { RedisManager } from "./redisManager";

console.log("Engine is running")
const redisClient = RedisManager.getInstance();
console.log("created redis client in engine worker")
while (true) {
    try {
        const order = await redisClient.getOrder();
        if (!order) continue;

        console.log("an order fetched from queue, now processing it")
        const orderId = JSON.parse(order).orderId;
        const { typeOfOrder } = JSON.parse(order).message;
        const { symbol, side, quantity, price, userId, limit } =
            JSON.parse(order).message.data;
        const response = handleOrder({
            orderId,
            typeOfOrder,
            symbol,
            side,
            quantity,
            userId,
            price,
            limit
        });
        console.log("order processed now publishing it ")
        console.log("response is ", JSON.stringify(response))
        redisClient.publisher(orderId, JSON.stringify(response));
    } catch (e) {
        console.log("Error in engine:", e);
    }
}
