import handleOrder from "./handleOrder";
import { RedisManager } from "./redisManager";

while (true) {
    const redisClient = RedisManager.getInstance();
    try {
        const order = await redisClient.getOrder();
        if (!order) continue;

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
        redisClient.publisher(orderId, JSON.stringify(response));
    } catch (e) {
        console.log("Error in engine:", e);
    }
}
