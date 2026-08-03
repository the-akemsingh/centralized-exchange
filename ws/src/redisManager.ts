import { type RedisClientType, createClient } from "redis";
import WebSocket from 'ws';
import dotenv from "dotenv";
dotenv.config();

type USER = {
    socket: WebSocket,
}

let USERS: USER[] = [];
let SUBSCRIPTIONS: Map<string, USER[]> = new Map();

export class RedisManager {
    private static instance: RedisManager;

    private redisSubscriber: RedisClientType;

    constructor() {
        this.redisSubscriber = createClient({
            url: process.env.REDIS_TRADE_UPDATES_SERVER_URL || "redis://localhost:6378",
        });
        this.redisSubscriber.connect();
    }

    public static getInstance() {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }

        return RedisManager.instance;
    }

    public subscribeTicker(channel: string, socket: WebSocket) {
        if (!SUBSCRIPTIONS.get(channel)) {
            SUBSCRIPTIONS.set(channel, []);
        }

        const users = SUBSCRIPTIONS.get(channel)!;
        const isSubscriptionExists = users.some((user) => user.socket === socket);

        if (!isSubscriptionExists) {
            users.push({ socket });
        }

        if (SUBSCRIPTIONS.get(channel)?.length === 1) {
            this.redisSubscriber.subscribe(channel, (response) => {
                this.updateHandler(channel, response);
            })
        }

    }

    updateHandler(channel: string, response: string) {
        SUBSCRIPTIONS.get(channel)?.forEach((user) => {
            if (user.socket.readyState === WebSocket.OPEN) {
                console.log("msg rec for channel ---", channel, "and mesg is --", response)
                user.socket.send(JSON.stringify({
                    channel,
                    data: JSON.parse(response)
                }));
            }
        })
    }

    public unsubscribeTicker(channel: string, socket: WebSocket) {
        const users = SUBSCRIPTIONS.get(channel);
        if (!users) {
            return;
        }
        SUBSCRIPTIONS.set(
            channel,
            users.filter((user) => user.socket !== socket)
        );
        if (SUBSCRIPTIONS.get(channel)?.length === 0) {
            SUBSCRIPTIONS.delete(channel);
            this.redisSubscriber.unsubscribe(channel);
        }
    }

    public removeSocket(socket: WebSocket) {
        USERS = USERS.filter((user) => user.socket !== socket);
        SUBSCRIPTIONS.forEach((users, channel) => {
            if (users.some((user) => user.socket === socket)) {
                this.unsubscribeTicker(channel, socket);
            }
        });
    }

}