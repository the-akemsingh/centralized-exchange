import { type RedisClientType, createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();
import { v7 as uuidv7 } from "uuid";

type OrderMessage = {
  type: "CREATE_ORDER" | "DELETE_ORDER" | "GET_DEPTH" | "GET_TICKER" | "GET_TRADES" | "GET_MARKETS" | "REGISTER_USER" | "GET_BALANCE";
  data?: {
    symbol?: string;
    side?: string;
    quantity?: number;
    userId?: string;
    price?: number;
    orderId?: string;
    limit?: number;
  };
};

export class RedisManager {
  private static redisManagerInsatance: RedisManager;
  private redisQueue: RedisClientType;
  private redisSubscriber: RedisClientType;
  private ready: Promise<void>;

  private constructor() {
    this.redisQueue = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.redisSubscriber = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.redisQueue.on("error", (err) => {
      console.error("[api][redisQueue] error:", err);
    });
    this.redisSubscriber.on("error", (err) => {
      console.error("[api][redisSubscriber] error:", err);
    });

    this.ready = Promise.all([
      this.redisQueue.connect(),
      this.redisSubscriber.connect(),
    ]).then(() => {
      console.log("[api][redis] clients connected");
    });
  }

  public static getInstance() {
    if (!RedisManager.redisManagerInsatance) {
      RedisManager.redisManagerInsatance = new RedisManager();
    }

    return RedisManager.redisManagerInsatance;
  }

  public async sendAndAwait(message: OrderMessage) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const orderId = this.generateRandomId();
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const cleanup = async () => {
        if (timeout) clearTimeout(timeout);
        try {
          await this.redisSubscriber.unsubscribe(orderId);
        } catch (err) {
          console.error(`[api][redis] failed to unsubscribe ${orderId}:`, err);
        }
      };

      this.redisSubscriber
        .subscribe(orderId, async (res) => {
          console.log(`[api][redis] response received for ${orderId}`);
          await cleanup();
          try {
            resolve(JSON.parse(res));
          } catch {
            resolve(res);
          }
        })
        .then(async () => {
          console.log(`[api][redis] subscribed to ${orderId}`);
          await this.redisQueue.lPush("messages", JSON.stringify({ orderId, message }));
          console.log(`[api][redis] event sent to queue for ${orderId}`);

          timeout = setTimeout(async () => {
            await cleanup();
            reject(new Error(`Timed out waiting for redis response on channel ${orderId}`));
          }, 10000);
        })
        .catch(async (err) => {
          await cleanup();
          reject(err);
        });
    });
  }

  generateRandomId(): string {
    return uuidv7();
  }
}
