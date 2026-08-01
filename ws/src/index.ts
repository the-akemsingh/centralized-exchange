import WebSocket, { WebSocketServer } from 'ws'
import express from 'express'
import dotenv from 'dotenv';
import { RedisManager } from './redisManager';
dotenv.config();

type incomingMessageType = {
    type: string,
    channel: string
}
const app = express()
const httpServer = app.listen(process.env.WEBSOCKET_SERVER_PORT || 3002, () => {
    console.log(`Websocket server running on port${process.env.WEBSOCKET_SERVER_PORT || 3002}`)
})
const webSocketServer = new WebSocketServer({
    server: httpServer
})

webSocketServer.on("connection", (socket: WebSocket) => {
    console.log("a client connected");
    const redisClient = RedisManager.getInstance()
    socket.on("message", (message: string) => {
        const parsedMessage: incomingMessageType = JSON.parse(message)
        if (parsedMessage.type === "SUBSCRIBE") {
            const channel = parsedMessage.channel
            redisClient.subscribeTicker(channel, socket)
        }
        else if (parsedMessage.type === "UNSUBSCRIBE") {
            const channel = parsedMessage.channel
            redisClient.unsubscribeTicker(channel, socket)
        }
    })

    socket.on("close", (socket: WebSocket) => {
        redisClient.removeSocket(socket);
    })
    socket.on("error", (error) => {
        console.log("error occured in websocket server : ", error)
    })
})