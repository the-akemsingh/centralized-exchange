import type { RedisClientType } from "redis";
import { balances } from "./handleOrder";
import { v7 as uuidv7 } from "uuid";
import { RedisManager } from "./redisManager";

type Order = {
    quantity: number,
    price: number,
    orderId: string,
    side: "BUY" | "SELL",
    userId: string,
    filledQuantity: number
}
type fill = {
    price: number,
    quantity: number,
}
type trade = {
    id: string,
    quantity: number,
    amount: number,
    side: "SELL" | "BUY"
}
export class OrderBook {
    asks: Order[];
    bids: Order[];
    trades: trade[];
    baseAsset: string;
    quoteAsset: string
    lastTradedPrice: number;
    redisClient: RedisManager;
    constructor(baseAsset: string, quoteAsset: string, lastTradedPrice: number) {
        this.asks = [];
        this.bids = [];
        this.trades = [];
        this.baseAsset = baseAsset
        this.quoteAsset = quoteAsset
        this.lastTradedPrice = lastTradedPrice || 0;
        this.redisClient = RedisManager.getInstance()
    }

    ticker() {
        return `${this.baseAsset}_${this.quoteAsset}`
    }

    matchBid(
        orderId: string, userId: string, quantity: number, price: number

    ) {
        let fills: fill[] = []
        let filledQuantity = 0;
        for (let bid of this.bids) {
            if (quantity - filledQuantity === 0) break;

            if (bid.price >= price) {
                const filledQuantityFromThisBid = Math.min(bid.quantity - bid.filledQuantity, quantity - filledQuantity)

                filledQuantity += filledQuantityFromThisBid
                bid.filledQuantity += filledQuantityFromThisBid

                fills.push({
                    price: bid.price,
                    quantity: filledQuantityFromThisBid
                })
                const recentTrade: trade = {
                    id: uuidv7(),
                    amount: bid.price,
                    quantity: filledQuantityFromThisBid,
                    side: "SELL",
                }
                this.trades.push(recentTrade)


                const bidOrderUserId = bid.userId;

                balances.get(bidOrderUserId)![this.baseAsset].available += filledQuantityFromThisBid;
                balances.get(userId)![this.baseAsset].locked -= filledQuantityFromThisBid;

                const amountOriginallyLocked = filledQuantityFromThisBid * bid.price;
                const amountActuallySpent = filledQuantityFromThisBid * bid.price;
                const refundAmount = amountOriginallyLocked - amountActuallySpent;

                balances.get(bidOrderUserId)![this.quoteAsset].locked -= amountOriginallyLocked
                balances.get(bidOrderUserId)![this.quoteAsset].available += refundAmount

                balances.get(userId)![this.quoteAsset].available += filledQuantityFromThisBid * bid.price

                this.lastTradedPrice = bid.price
                const depth = this.getDepth()
                this.publishUpdates(this.lastTradedPrice, depth, recentTrade)
            }
        }
        for (let i = 0; i < this.bids.length; i++) {
            if (this.bids[i].filledQuantity >= this.bids[i].quantity) {
                this.bids.splice(i, 1);
                i--;
            }
        }

        if (quantity - filledQuantity > 0) {
            this.addOrder({
                quantity,
                price,
                orderId,
                side: "SELL",
                userId,
                filledQuantity
            })
            return {
                symbol: `${this.baseAsset}_${this.quoteAsset}`,
                fills,
                executedQuantity: filledQuantity,
                status: "PARTIALLY_FILLED",
                side: "SELL",
                orderId
            }
        }
        // TODO:
        //add this to db queue to sync the database with latest trades happening
        //publish this trade (for recent trades list) , ticker(send at which price recent trade happened) and depth(orderbook update on client side) to websocket for frontend
        return {
            symbol: `${this.baseAsset}_${this.quoteAsset}`,
            fills,
            executedQuantity: filledQuantity,
            status: "FULLY_FILLED",
            side: "SELL"
        }
    }

    matchAsk(
        orderId: string, userId: string, quantity: number, price: number
    ) {

        let fills: fill[] = []
        let filledQuantity = 0;


        for (let ask of this.asks) {
            if (quantity - filledQuantity === 0) break;

            if (ask.price <= price) {
                const filledQuantityFromThisAsk = Math.min(
                    ask.quantity - ask.filledQuantity,
                    quantity - filledQuantity
                );

                filledQuantity += filledQuantityFromThisAsk;
                ask.filledQuantity += filledQuantityFromThisAsk;

                fills.push({
                    price: ask.price,
                    quantity: filledQuantityFromThisAsk
                });

                this.trades.push({
                    id: uuidv7(),
                    amount: ask.price,
                    quantity: filledQuantityFromThisAsk,
                    side: "BUY",
                })
                this.lastTradedPrice = ask.price


                const askOrderUserId = ask.userId;

                // 1. MAKER (SELLER) GETS PAID AT THEIR ASK PRICE
                balances.get(askOrderUserId)![this.quoteAsset].available += (filledQuantityFromThisAsk * ask.price);
                balances.get(askOrderUserId)![this.baseAsset].locked -= filledQuantityFromThisAsk;

                // 2. TAKER (BUYER) BALANCES UPDATE
                // Total amount originally locked for this specific portion of the trade:
                const amountOriginallyLocked = filledQuantityFromThisAsk * price;
                // Total amount actually spent:
                const amountActuallySpent = filledQuantityFromThisAsk * ask.price;
                // Price improvement refund (excess quote asset):
                const refundAmount = amountOriginallyLocked - amountActuallySpent;

                // Deduct the full originally locked amount from locked
                balances.get(userId)![this.quoteAsset].locked -= amountOriginallyLocked;
                // Add the refund back to available balance!
                balances.get(userId)![this.quoteAsset].available += refundAmount;

                // Give the buyer their base assets
                balances.get(userId)![this.baseAsset].available += filledQuantityFromThisAsk;
            }
        }
        for (let i = 0; i < this.asks.length; i++) {
            if (this.asks[i].filledQuantity >= this.asks[i].quantity) {
                this.asks.splice(i, 1);
                i--;
            }
        }
        if (quantity - filledQuantity > 0) {
            //means now orderbook is empty of there is no matching order  - add this order in orderbook
            this.addOrder({
                quantity,
                price,
                orderId,
                side: "BUY",
                userId,
                filledQuantity
            })
            return {
                symbol: `${this.baseAsset}_${this.quoteAsset}`,
                fills,
                executedQuantity: filledQuantity,
                status: "PARTIALLY_FILLED",
                side: "BUY",
                orderId
            }
        }

        // TODO:
        //add this to db queue to sync the database with latest trades happening
        //publish this trade (for recent trades list) , ticker(send at which price recent trade happened) and depth(orderbook update on client side) to websocket for frontend
        return {
            symbol: `${this.baseAsset}_${this.quoteAsset}`,
            fills,
            executedQuantity: filledQuantity,
            status: "FULLY_FILLED",
            side: "BUY"
        }

    }

    getDepth(): { bids: [string, string][], asks: [string, string][] } {
        const bids: [string, string][] = []; // [price, quantity]
        const asks: [string, string][] = [];

        const bidsObj: { [key: string]: number } = {};
        const asksObj: { [key: string]: number } = {};

        for (let i = 0; i < this.bids.length; i++) {
            const order = this.bids[i];
            if (!bidsObj[order.price]) {
                bidsObj[order.price] = 0;
            }
            bidsObj[order.price] += order.quantity;
        }

        for (let i = 0; i < this.asks.length; i++) {
            const order = this.asks[i];
            if (!asksObj[order.price]) {
                asksObj[order.price] = 0;
            }
            asksObj[order.price] += order.quantity;
        }

        for (const price in bidsObj) {
            bids.push([price, bidsObj[price].toString()]);
        }

        for (const price in asksObj) {
            asks.push([price, asksObj[price].toString()]);
        }

        return {
            bids,
            asks
        };
    }

    addOrder(order: {
        quantity: number,
        price: number,
        orderId: string,
        side: "BUY" | "SELL",
        userId: string,
        filledQuantity: number
    }) {
        let newOrder = {
            quantity: order.quantity,
            orderId: order.orderId,
            price: order.price,
            userId: order.userId,
            filledQuantity: order.filledQuantity,
            side: order.side
        }
        if (order.side == "BUY") {
            this.bids.push(newOrder)

        } else {
            this.asks.push(newOrder)

        }
    }

    publishUpdates(lastTradedPrice: number, depth: { bids: [string, string][], asks: [string, string][] }, recentTrade: trade) {
        const ticker = this.ticker()
        this.redisClient.publisher(`trade@${ticker}`, JSON.stringify(recentTrade))
        this.redisClient.publisher(`ticker@${ticker}`, JSON.stringify(lastTradedPrice))
        this.redisClient.publisher(`depth@${ticker}`, JSON.stringify(depth))
    }

    deleteOrder(orderId: string) {
        this.asks.filter(ask => ask.orderId !== orderId)
        this.bids.filter(bid => bid.orderId !== orderId)

        return {
            status: "ORDER_DELETED"
        }
    }
}
