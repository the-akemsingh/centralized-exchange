import handleOrder, { deleteOrder, getBalanceByUserId, getDepth, getLatestPrice, getMarkets, getTrades, registerUser } from "./handleOrder";
import { RedisManager } from "./redisManager";

console.log("Engine is running")
const redisClient = RedisManager.getInstance();

while (true) {
    try {
        const order = await redisClient.getOrder();
        if (!order) continue;

        console.log("an order fetched from queue, now processing it")

        let parsedOrder: {
            orderId?: string;
            message?: {
                type?: string;
                data?: {
                    symbol?: string;
                    side?: string;
                    quantity?: number;
                    price?: number;
                    userId?: string;
                };
            };
        };

        parsedOrder = JSON.parse(order);
        const orderId = parsedOrder.orderId;
        const message = parsedOrder.message;

        if (!orderId || !message) {
            console.log("Skipping malformed queue payload:", order);
            continue;
        }

        const type = message.type;
        if (!type) {
            console.log("Skipping order without type:", order);
            continue;
        }

        const { symbol, side, quantity, price, userId } = message.data ?? {};

        switch (message.type) {
            case "GET_MARKETS":
                const markets = getMarkets()
                Publish(orderId, JSON.stringify(markets));
                continue
            case "REGISTER_USER":
                const newUser = registerUser()
                Publish(orderId, JSON.stringify(newUser));
                continue
            case "GET_BALANCE":
                if (!userId) {
                    continue;
                }
                const balanceInfo = getBalanceByUserId(userId);
                Publish(orderId, JSON.stringify(balanceInfo));
                continue;
            case "GET_TRADES":
                if (!symbol) {
                    continue;
                }
                const trades = getTrades(symbol);
                Publish(orderId, JSON.stringify(trades));
                continue
            case "GET_TICKER":
                if (!symbol) {
                    continue;
                }
                const latestPrice = getLatestPrice(symbol);
                Publish(orderId, JSON.stringify(latestPrice));
                continue;
            case "GET_DEPTH":
                if (!symbol) {
                    continue
                }
                const depth = getDepth(symbol);
                Publish(orderId, JSON.stringify(depth))
                continue
            case "DELETE_ORDER":
                if (!orderId) {
                    continue;
                }
                else if (!symbol) {
                    continue;
                }
                const deleteOrderStatus = deleteOrder(orderId, symbol);
                Publish(orderId, JSON.stringify(deleteOrderStatus));
                continue
            case "CREATE_ORDER":
                if (!orderId || !symbol || !side || !quantity || !price || !userId) {
                    continue;
                }
                const createOrderStatus = handleOrder({
                    orderId,
                    symbol,
                    side,
                    quantity,
                    price,
                    userId
                });
                Publish(orderId, JSON.stringify(createOrderStatus));

        }
    } catch (e) {
        console.log("Error in engine:", e);
    }
}


function Publish(channel: string, message: string) {
    redisClient.apiResponsepublisher(channel, message);
}