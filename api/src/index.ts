import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { RedisManager } from "./redisManager";
import { prisma } from "@db/prismaClient"
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
  const { symbol } = req.query;
  //in here, we should add limit query filter too
  const response = await RedisManager.getInstance().sendAndAwait({
    type: "GET_TRADES",
    data: {
      symbol: symbol as string,
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

app.get("/klines", async (req, res) => {
  const { symbol, interval, startTime, endTime, limit } = req.query;
  if (!symbol || !interval || !startTime || !endTime) {
    return res.status(400).json({
      message: "Missing required query parameters",
    });
  }
  const bucketMap: Record<string, string> = {
    "1m": "1 minute",
    "5m": "5 minutes",
    "15m": "15 minutes",
    "30m": "30 minutes",
    "1h": "1 hour",
    "4h": "4 hours",
    "1d": "1 day",
  };
  const bucket = bucketMap[interval as string];
  if (!bucket) {
    return res.status(400).json({
      message: "Unsupported interval",
    });
  }
  const candles = await prisma.$queryRawUnsafe(
    `
        SELECT
            time_bucket('${bucket}', timestamp) AS time,
            first(price, timestamp) AS open,
            max(price) AS high,
            min(price) AS low,
            last(price, timestamp) AS close,
            sum(quantity) AS volume
        FROM "Trade"
        WHERE symbol = $1
          AND timestamp >= to_timestamp($2 / 1000.0)
          AND timestamp <= to_timestamp($3 / 1000.0)
        GROUP BY time
        ORDER BY time ASC
        LIMIT $4
        `,
    symbol,
    Number(startTime),
    Number(endTime),
    Number(limit ?? 500)
  );

  res.status(200).json(candles);
  return
});

app.listen(`${process.env.PORT || 3001}`, () => {
  console.log(`api server listening on port ${process.env.PORT || 3001}`);
});
