import { type RedisClientType, createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

export class RedisManager {
  private static redisManagerInsatance: RedisManager;
  private redisApiResponsePublisher: RedisClientType;
  private redisQueue: RedisClientType;
  private redisTradeUpdatesPublisher: RedisClientType;
  private redisDbQueuePublisher: RedisClientType;
  private ready: Promise<void>;

  private constructor() {
    this.redisApiResponsePublisher = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.redisQueue = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.redisTradeUpdatesPublisher = createClient({
      url: process.env.REDIS_TRADE_UPDATES_SERVER_URL || "redis://localhost:6378",
    });

    this.redisDbQueuePublisher = createClient({
      url: process.env.REDIS_DATABASE_QUEUE_SERVER_URL || "redis://localhost:6377",
    });

    this.ready = Promise.all([
      this.redisApiResponsePublisher.connect(),
      this.redisQueue.connect(),
      this.redisTradeUpdatesPublisher.connect(),
      this.redisDbQueuePublisher.connect()
    ]).then(() => {
      console.log("[api][redis] clients connected");
    }).catch((e) => {
      console.log("Error in redis connection", e)
    });
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

  public apiResponsepublisher(channel: string, message: string) {
    this.redisApiResponsePublisher.publish(channel, message)
  }

  public tradeUpdatesPublisher(channel: string, message: string) {
    this.redisTradeUpdatesPublisher.publish(channel, message)
  }

  public dbPublisher(channel: string, message: string) {
    this.redisDbQueuePublisher.lPush(channel, message)
  }
}
