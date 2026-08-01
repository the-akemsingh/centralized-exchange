import { type RedisClientType, createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();
import { v7 as uuidv7 } from "uuid";
import { CREATE_ORDER } from "./types";

export class RedisManager {
  private static redisManagerInsatance: RedisManager;
  private redisQueue: RedisClientType;
  private redisSubscriber: RedisClientType;

  private constructor() {
    this.redisQueue = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    this.redisQueue.connect();

    this.redisSubscriber = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    this.redisSubscriber.connect();
  }

  public static getInstance() {
    if (!RedisManager.redisManagerInsatance) {
      RedisManager.redisManagerInsatance = new RedisManager();
    }

    return RedisManager.redisManagerInsatance;
  }

  public sendAndAwait(message: {
    typeOfOrder: "CREATE_ORDER" | "DELETE_ORDER" | "GET_DEPTH" | "GET_TICKER" | "GET_TRADES";
    data: {
      symbol?: string;
      side?: string;
      quantity?: number;
      userId?: string;
      price?: number;
      orderId?:string;
      limit?:number;
    };
  }) {
    return new Promise((resolve) => {
      const orderId = this.generateRandomId();
      this.redisSubscriber.subscribe(orderId, (res) => {
        this.redisSubscriber.unsubscribe(orderId);
        resolve(JSON.parse(res));
      });
      this.redisQueue.lPush("messages", JSON.stringify({ orderId, message }));
    });
  }

  generateRandomId(): string {
    return uuidv7();
  }
}
