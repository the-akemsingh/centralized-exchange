import { type RedisClientType, createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

export class RedisManager {
  private static redisManagerInsatance: RedisManager;
  private redisPublisher: RedisClientType;
  private redisQueue: RedisClientType;

  private constructor() {
    this.redisPublisher = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    this.redisPublisher.connect();

    this.redisQueue = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    this.redisQueue.connect();
  }

  public static getInstance() {
    if (!RedisManager.redisManagerInsatance) {
      RedisManager.redisManagerInsatance = new RedisManager();
    }

    return RedisManager.redisManagerInsatance;
  }

  public async getOrder() {
    return await this.redisQueue.rPop("messages");
  }

  public publisher(channel: string, message: string) {
    this.redisPublisher.publish(channel, message)
  }

  // TODO : a third redis client, that will push the events for a particular BASEASSET_QUOTEASSET. events are : ticker (TATA_INR current price Rs89.9), trade (list of all recent trades happens for  TATA_INR, maybe last 20), depth (orderbook for TATA_INR) - we emit all events from engine, whoever is subscribed to a ticker will get those events

  // TODO : create a fourth redis client, that will push the orders/trades happening in a queue, from where db worker will get them and sync the database
}
