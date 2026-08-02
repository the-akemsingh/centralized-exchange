export type DepthState = {
  bids: [string, string][];
  asks: [string, string][];
};

export type TradeState = {
  price: number;
  quantity: number;
  side?: string;
  orderId?: string;
};

export type BalanceAssetState = {
  available: number;
  locked: number;
};

export type AccountState = Record<string, BalanceAssetState>;
