import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { RedisManager } from "./redisManager";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.get("/depth/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const response = await RedisManager.getInstance().sendAndAwait({
    typeOfOrder: "GET_DEPTH",
    data: { symbol }
  });
  res.json(response);
});

app.get("/tickers/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const response = await RedisManager.getInstance().sendAndAwait({
    typeOfOrder: "GET_TICKER",
    data: { symbol }
  });
  res.json(response);
});

app.get("/trades", async (req, res) => {
  const { symbol, limit } = req.query;
  const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
  const response = await RedisManager.getInstance().sendAndAwait({
    typeOfOrder: "GET_TRADES",
    data: {
      symbol: symbol as string,
      limit: parsedLimit
    }
  });
  res.json(response);
});

app.post("/trades", async (req, res) => {
  const { symbol, side, price, quantity, userId } = req.body;
  const response = await RedisManager.getInstance().sendAndAwait({
    typeOfOrder: "CREATE_ORDER",
    data: {
      symbol,
      side,
      quantity,
      userId,
      price
    },
  });
  res.status(201).json(response);
});

app.delete("/trades/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const { symbol } = req.body;
  const response = await RedisManager.getInstance().sendAndAwait({
    typeOfOrder: "DELETE_ORDER",
    data: {
      orderId,
      symbol,
    },
  });
  res.status(201).json(response);
});

app.listen(`${process.env.PORT || 3001}`, () => {
  console.log(`api server listening on port ${process.env.PORT || 3001}`);
});
