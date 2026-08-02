import { AR_PREDICATE_COMBINATORS } from "redis";
import { OrderBook } from "./orderBook";

type userInfo = {
  [key: string]: {
    available: number;
    locked: number;
  };
};
export const balances: Map<string, userInfo> = new Map();
balances.set("akem", {
  "INR": {
    available: 10000000,
    locked: 0
  },
  "TATA": {
    available: 10000,
    locked: 0
  }
})
balances.set("raman", {
  "INR": {
    available: 10000000,
    locked: 0
  },
  "TATA": {
    available: 10000,
    locked: 0
  }
})
const TATA_INR = new OrderBook("TATA", "INR", 0);
const orderBooks: OrderBook[] = [TATA_INR];

function handleOrder(message: {
  orderId: string;
  typeOfOrder: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  userId: string;
  limit: number;
}) {
  console.log("now handleOrder have the order")
  const baseAsset = message.symbol.split("_")[0];
  console.log("base a", baseAsset)
  const quoteAsset = message.symbol.split("_")[1];
  console.log("quote a", quoteAsset)
  const orderBook = orderBooks.find(
    (orderBook) => orderBook.ticker() === message.symbol,
  );
  if (!orderBook) {
    throw new Error(`Orderbook not found - ${message.symbol}  `);
  }
  switch (message.typeOfOrder) {
    case "CREATE_ORDER":
      try {
        if (message.side == "BUY") {
          console.log("order was buy order")
          let userQuoteAssetRecord = balances.get(message.userId)?.[quoteAsset];
          if (
            userQuoteAssetRecord &&
            userQuoteAssetRecord.available >= message.price * message.quantity
          ) {
            console.log("user have enough balance")
            lockUserBalance({
              userId: message.userId,
              asset: quoteAsset,
              amountToBeLocked: message.price * message.quantity,
            });
            return orderBook.matchAsk(
              message.orderId,
              message.userId,
              message.quantity,
              message.price,
            );
          } else {
            console.log("user qoute asset record - -", JSON.stringify(userQuoteAssetRecord))
            return { status: "REJECTED", reason: "INSUFFICIENT_FUNDS" };
          }
        } else {
          let userBaseAssetRecord = balances.get(message.userId)?.[baseAsset];
          if (
            userBaseAssetRecord &&
            userBaseAssetRecord.available >= message.quantity
          ) {
            lockUserBalance({
              userId: message.userId,
              asset: baseAsset,
              amountToBeLocked: message.quantity,
            });
            return orderBook.matchBid(
              message.orderId,
              message.userId,
              message.quantity,
              message.price,
            );
          } else {
            console.log("user base asset record - -", JSON.stringify(userBaseAssetRecord))
            return { status: "REJECTED", reason: "INSUFFICIENT_FUNDS" };
          }
        }
      } catch (e) {
        console.log("error in engine's create order block - ", e);
      }
      break;
    case "DELETE_ORDER":
      try {
        const orderId = message.orderId;
        return orderBook.deleteOrder(orderId);
      } catch (e) {
        console.log("error in engine's create order block - ", e);
      }
      break;
    case "GET_DEPTH":
      try {
        console.log("get depth order rec")
        const depth = orderBook.getDepth();
        console.log(JSON.stringify(depth))
        return depth
      } catch (e) {
        console.log("error in engine's create order block - ", e);
      }
      break;
    case "GET_TICKER":
      try {
        const ticker = orderBook.lastTradedPrice;
        return ticker
      } catch (e) {
        console.log("error in engine's create order block - ", e);
      }
      break;
    case "GET_TRADES":
      try {
        return orderBook.trades;
      } catch (e) {
        console.log("error in engine's create order block - ", e);
      }
      break;
  }
}

function lockUserBalance(data: {
  userId: string;
  asset: string;
  amountToBeLocked: number;
}) {
  const userAsset = balances.get(data.userId)?.[data.asset];
  if (userAsset && userAsset.available >= data.amountToBeLocked) {
    userAsset.available -= data.amountToBeLocked;
    userAsset.locked += data.amountToBeLocked;
  }

  console.log("user balance locked")
}
export default handleOrder;
