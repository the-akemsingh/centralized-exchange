
import { type RedisClientType, createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

export class RedisManager {
    private static instance: RedisManager;
    redisClient: RedisClientType;
    constructor() {
        this.redisClient = createClient({
            url: process.env.REDIS_URL || "redis://localhost:6377",
        });

        this.redisClient.connect();
    }
    public static getInstance() {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager()
        }

        return RedisManager.instance;
    }

    async getTrades() {
        const trade = await this.redisClient.rPop("TRADE_RECORDED")
        return trade;
    }
}