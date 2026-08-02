import { OrderBook } from "./orderBook";
import { v7 as uuidv7 } from "uuid";

type userInfo = {
  [key: string]: {
    available: number;
    locked: number;
  };
};
export const balances: Map<string, userInfo> = new Map();
const TATA_INR = new OrderBook("TATA", "INR", 0);
const orderBooks: OrderBook[] = [TATA_INR];

function handleOrder(message: {
  orderId: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  userId: string;
}) {
  const baseAsset = message.symbol.split("_")[0];
  const quoteAsset = message.symbol.split("_")[1];

  const orderBook = getOrderBook(message.symbol)
  try {
    if (message.side == "BUY") {

      const isUserBalanceSufficient = checkUserBalance(message.userId, quoteAsset, message.quantity, message.price,);
      if (isUserBalanceSufficient) {
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
      }
      else {
        return { status: "REJECTED", reason: "INSUFFICIENT_FUNDS" };
      }
    }
    else {
      const isUserBalanceSufficient = checkUserBalance(message.userId, baseAsset, message.quantity);
      if (isUserBalanceSufficient) {
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
      }
      else {
        return { status: "REJECTED", reason: "INSUFFICIENT_FUNDS" };
      }
    }
  } catch (e) {
    console.log("error in engine's create order block - ", e);
  }
}

function checkUserBalance(userId: string, asset: string, quantity: number, price?: number): boolean {
  let userAssetRecord = balances.get(userId)?.[asset];
  if (userAssetRecord && userAssetRecord.available >= quantity * (price ?? 1)
  ) {
    return true
  }

  return false;
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

export function getOrderBook(ticker: string) {
  const orderBook = orderBooks.find(
    (orderBook) => orderBook.ticker() === ticker,
  );
  if (!orderBook) {
    throw new Error(`Orderbook not found - ${ticker}`);
  }
  return orderBook;
}

export function getTrades(ticker: string) {
  const orderBook = getOrderBook(ticker);
  return orderBook.trades;
}

export function getLatestPrice(ticker: string) {
  const orderBook = getOrderBook(ticker);
  return orderBook.lastTradedPrice;
}

export function getDepth(ticker: string) {
  const orderBook = getOrderBook(ticker);
  const depth = orderBook.getDepth();
  return depth
}

export function deleteOrder(orderId: string, ticker: string) {
  const orderBook = getOrderBook(ticker);
  return orderBook.deleteOrder(orderId);

}

export function getMarkets(): string[] {
  try {
    const markets: string[] = []
    orderBooks.forEach((ob) => {
      markets.push(ob.ticker());
    })
    return markets;
  } catch (e) {
    console.log("error in engine's create order block - ", e);
    return []
  }
}

export function registerUser() {
  const userId = uuidv7();
  balances.set(userId, {
    "INR": {
      available: 100000,
      locked: 0
    },
    "TATA": {
      available: 100,
      locked: 0
    }
  })

  return {
    userId,
    account: getBalanceByUserId(userId)
  }
}

export function getBalanceByUserId(userId: string) {
  const balanceInfo = balances.get(userId);
  return balanceInfo;
}

export default handleOrder;
