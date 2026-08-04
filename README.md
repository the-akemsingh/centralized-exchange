# Exchange

## Architecture

```mermaid
flowchart LR
    B[Browser]
    API[REST API]
    Q1[(Redis order queue)]
    E[Matching engine]
    API_PS[(Redis pub/sub)]
    PS[(Redis pub/sub)]
    WS[WebSocket server]
    Q2[(Redis trade queue)]
    DW[Database worker]
    DB[(TimescaleDB)]

    B -->|HTTP| API
    API --> |Push incoming order requests| Q1
    Q1 -->|picks jobs from queue sequentially| E
    E -->|executed job's response| API_PS
    API_PS -->|pub/sub| API
    E -->|ticker, depth, trades| PS
    PS --> WS
    WS -->|live updates| B
    B -->|sub. to a ticker related events| WS
    E -->|executed trades| Q2
    Q2 --> DW
    DW --> DB
    API -->|candlesticks| DB
```

Redis is used in three roles: a request/response queue between the API and engine, pub/sub for realtime market data, and a queue for trade persistence. The database schema stores individual trades; the API aggregates them into OHLCV candles using `time_bucket`.

A centralized exchange (CEX) demo for trading a single hard-coded market: **TATA_INR**. It includes a limit-order matching engine, live order-book updates, a browser trading interface, and asynchronous trade persistence.

Every newly registered user receives a simulated trading account with:

| Asset | Available balance |
| --- | ---: |
| INR | 100,000 |
| TATA | 100 |

> This is an educational/demo application. Balances are held in the running engine's memory, so accounts and open orders reset when the engine restarts. It is not suitable for real-money trading.

## Services

| Directory | Responsibility | Default port |
| --- | --- | ---: |
| `web` | Next.js trading terminal | 3000 |
| `api` | REST API and bridge to the matching engine | 3001 |
| `ws` | WebSocket subscriptions for realtime data | 3002 |
| `engine` | In-memory order book, matching, balances, and market data publishing | — |
| `db-worker` | Consumes executed-trade events and writes them to the database | — |
| `db` | Prisma schema, client, and migrations | — |

## Prerequisites

- [Bun](https://bun.sh/) 1.x
- Redis instances for the order queue, realtime updates, and database queue
- PostgreSQL with the TimescaleDB extension when using the `/klines` endpoint (it calls `time_bucket`)

## Configuration

Create a `.env` file in each service directory that needs one, or supply the variables through your process environment.

```env
# api and engine: order request/response queue
REDIS_URL=redis://localhost:6379

# engine and ws: realtime pub/sub
REDIS_TRADE_UPDATES_SERVER_URL=redis://localhost:6378

# engine: trade persistence queue
REDIS_DATABASE_QUEUE_SERVER_URL=redis://localhost:6377

# db-worker: trade persistence queue
REDIS_URL=redis://localhost:6377

# api
PORT=3001

# ws
WEBSOCKET_SERVER_PORT=3002

# api and db-worker: PostgreSQL / TimescaleDB
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/exchange

# web (optional; these are the development defaults except for WebSocket)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

The three Redis URLs may point to separate Redis servers, as shown in the architecture, or to one Redis instance using different logical endpoints as appropriate for local development.

## Run locally

1. Start Redis and PostgreSQL/TimescaleDB, then configure the environment variables above.
2. Install dependencies in each runnable service:

   ```powershell
   foreach ($service in 'api', 'engine', 'ws', 'db-worker', 'db', 'web') {
     Push-Location $service
     bun install
     Pop-Location
   }
   ```

3. Apply the database migration from `db`:

   ```powershell
   Set-Location db
   bunx prisma migrate deploy
   ```

4. In separate terminals, start the backend services before the UI:

   ```powershell
   Set-Location engine; bun run dev
   Set-Location db-worker; bun run dev
   Set-Location api; bun run dev
   Set-Location ws; bun run dev
   ```

5. Start the frontend:

   ```powershell
   Set-Location web
   bun run dev
   ```

Open [http://localhost:3000](http://localhost:3000). The UI automatically registers an account the first time it is opened in a browser and saves its user ID in local storage.

## REST API

All endpoints are served by the API on `http://localhost:3001` by default.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/register` | Creates a simulated user with 100,000 INR and 100 TATA. |
| `GET` | `/getBalance/:userId` | Returns available and locked balances. |
| `GET` | `/markets` | Lists supported markets (`TATA_INR`). |
| `GET` | `/depth/:symbol` | Returns aggregated bids and asks. |
| `GET` | `/tickers/:symbol` | Returns the most recent traded price. |
| `GET` | `/trades?symbol=TATA_INR` | Returns recent in-memory trades. |
| `POST` | `/trades` | Places a limit order. |
| `DELETE` | `/trades/:orderId` | Removes an open order; pass `symbol` in the JSON body. |
| `GET` | `/klines` | Returns persisted OHLCV candles. |

Example order:

```bash
curl -X POST http://localhost:3001/trades \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TATA_INR","side":"BUY","quantity":5,"price":200,"userId":"<user-id>"}'
```

`side` must be `BUY` or `SELL`. The engine locks the required INR for buy orders or TATA shares for sell orders before matching. Orders are matched by price and may be partially filled; remaining quantity stays on the in-memory order book.

For candles, send `symbol`, `interval`, `startTime`, and `endTime`; `limit` is optional. Supported intervals are `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, and `1d`.

```text
GET /klines?symbol=TATA_INR&interval=1m&startTime=1710000000000&endTime=1710086400000&limit=500
```

## WebSocket API

Connect to `ws://localhost:3002` by default and send JSON subscription messages:

```json
{ "type": "SUBSCRIBE", "channel": "depth@TATA_INR" }
```

Available channels are:

- `ticker@TATA_INR` — last traded price
- `depth@TATA_INR` — aggregated order-book bids and asks
- `trade@TATA_INR` — newly executed trades

Use the same shape with `"type": "UNSUBSCRIBE"` to stop a subscription. Realtime messages are delivered as:

```json
{ "channel": "depth@TATA_INR", "data": { "bids": [], "asks": [] } }
```

## Project status and limitations

- Only `TATA_INR` is currently configured.
- The matching engine and account balances are in memory and are not durable.
- The API has no authentication; the browser treats the locally stored user ID as its account identifier.
- This project is intended as a learning implementation of exchange architecture, not as production trading infrastructure.
