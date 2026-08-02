import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { RedisManager } from "./redisManager";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());


app.post("/register", async (req, res) => {
  const response = await RedisManager.getInstance().sendAndAwait({
    type: "REGISTER_USER"
  })
  res.status(201).json({
    response
  })
})

app.get("/getBalance/:userId", async (req, res) => {
  const { userId } = req.params;
  const response = await RedisManager.getInstance().sendAndAwait({
    type: "GET_BALANCE",
    data: {
      userId
    }
  })
  res.status(201).json({
    response
  })
})


app.get("/markets", async (req, res) => {
  const response = await RedisManager.getInstance().sendAndAwait({
    type: "GET_MARKETS"
  })
  res.status(200).json({
    markets: response
  })
})
app.get("/depth/:symbol", async (req, res) => {
  const { symbol } = req.params;
  console.log("get depth req rec,")
  const response = await RedisManager.getInstance().sendAndAwait({
    type: "GET_DEPTH",
    data: { symbol }
  });
  res.json(response);
});

app.get("/tickers/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const response = await RedisManager.getInstance().sendAndAwait({
    type: "GET_TICKER",
    data: { symbol }
  });
  res.json(response);
});

app.get("/trades", async (req, res) => {
  const { symbol, limit } = req.query;
  const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
  const response = await RedisManager.getInstance().sendAndAwait({
    type: "GET_TRADES",
    data: {
      symbol: symbol as string,
      limit: parsedLimit
    }
  });
  res.json(response);
});

app.post("/trades", async (req, res) => {
  console.log("trade create req received")
  const { symbol, side, price, quantity, userId } = req.body;
  console.log(symbol, side, price, quantity, userId)
  const response = await RedisManager.getInstance().sendAndAwait({
    type: "CREATE_ORDER",
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
    type: "DELETE_ORDER",
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
