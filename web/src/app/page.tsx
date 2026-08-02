"use client";

import { useEffect, useState } from "react";
import { ChartPlaceholder } from "@/components/trading/chart-placeholder";
import { OrderTicket } from "@/components/trading/order-ticket";
import { OrderbookTradesPanel } from "@/components/trading/orderbook-trades-panel";
import type { AccountState, DepthState, TradeState } from "@/components/trading/types";

const SYMBOL = "TATA_INR";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3005";
const STORAGE_KEY = "exchange-user-id";

function normalizeTrade(trade: unknown): TradeState | null {
  if (!trade || typeof trade !== "object") {
    return null;
  }

  const incoming = trade as {
    price?: number;
    amount?: number;
    quantity?: number;
    side?: string;
    orderId?: string;
    id?: string;
  };

  const price = incoming.price ?? incoming.amount;

  if (typeof price !== "number" || typeof incoming.quantity !== "number") {
    return null;
  }

  return {
    price,
    quantity: incoming.quantity,
    side: incoming.side,
    orderId: incoming.orderId ?? incoming.id,
  };
}

export default function Home() {
  const selectedSymbol = SYMBOL;
  const [ticker, setTicker] = useState<number | null>(null);
  const [depth, setDepth] = useState<DepthState>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<TradeState[]>([]);
  const [status, setStatus] = useState("Disconnected");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("0");
  const [userId, setUserId] = useState("");
  const [account, setAccount] = useState<AccountState | null>(null);
  const [authStatus, setAuthStatus] = useState("Loading account...");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadAccount = async () => {
      try {
        const storedUserId = window.localStorage.getItem(STORAGE_KEY);

        if (storedUserId) {
          setUserId(storedUserId);
          const response = await fetch(`${API_BASE}/getBalance/${storedUserId}`, {
            method: "GET"
          });

          const payload = await response.json();
          const fetchedAccount = (payload?.response ?? null) as AccountState | null;

          if (!mounted) {
            return;
          }

          setAccount(fetchedAccount);
          setAuthStatus("Account loaded");
          return;
        }

        const response = await fetch(`${API_BASE}/register`, {
          method: "POST",
        });

        const payload = await response.json();
        const newUserId = payload?.response?.userId as string | undefined;
        const newAccount = (payload?.response?.account ?? null) as AccountState | null;

        if (!mounted) {
          return;
        }

        if (newUserId) {
          window.localStorage.setItem(STORAGE_KEY, newUserId);
          setUserId(newUserId);
        }

        setAccount(newAccount);
        setAuthStatus("New account created");
      } catch {
        if (mounted) {
          setAuthStatus("Account unavailable");
        }
      }
    };

    loadAccount();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let mounted = true;

    const loadSnapshot = async () => {
      try {
        const [tickerResponse, depthResponse, tradesResponse] = await Promise.all([
          fetch(`${API_BASE}/tickers/${selectedSymbol}`),
          fetch(`${API_BASE}/depth/${selectedSymbol}`),
          fetch(`${API_BASE}/trades?symbol=${selectedSymbol}&limit=20`),
        ]);

        if (!mounted) {
          return;
        }

        const tickerData = await tickerResponse.json();
        const depthData = await depthResponse.json();
        const tradesData = await tradesResponse.json();

        if (typeof tickerData === "number") {
          setTicker(tickerData);
        } else if (tickerData && typeof tickerData === "object") {
          setTicker(Number(tickerData.price ?? tickerData.lastTradedPrice ?? 0));
        }

        if (depthData && typeof depthData === "object") {
          setDepth({
            bids: Array.isArray(depthData.bids) ? depthData.bids : [],
            asks: Array.isArray(depthData.asks) ? depthData.asks : [],
          });
        }

        if (Array.isArray(tradesData)) {
          setTrades(tradesData.map(normalizeTrade).filter((trade): trade is TradeState => trade !== null));
        }
      } catch {
        setMessage("Failed to load initial market snapshot.");
      }
    };

    loadSnapshot();

    try {
      socket = new WebSocket(WS_URL);
      socket.onopen = () => {
        if (!mounted) {
          return;
        }

        setStatus("Connected");
        socket?.send(JSON.stringify({ type: "SUBSCRIBE", channel: `ticker@${selectedSymbol}` }));
        socket?.send(JSON.stringify({ type: "SUBSCRIBE", channel: `depth@${selectedSymbol}` }));
        socket?.send(JSON.stringify({ type: "SUBSCRIBE", channel: `trade@${selectedSymbol}` }));
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data as string) as { channel?: string; data?: unknown };
        if (!payload.channel) {
          return;
        }

        if (payload.channel.startsWith("ticker@")) {
          setTicker(Number(payload.data ?? 0));
          return;
        }

        if (payload.channel.startsWith("depth@") && payload.data && typeof payload.data === "object") {
          const incoming = payload.data as DepthState;
          setDepth({
            bids: Array.isArray(incoming.bids) ? incoming.bids : [],
            asks: Array.isArray(incoming.asks) ? incoming.asks : [],
          });
          return;
        }

        if (payload.channel.startsWith("trade@")) {
          const normalizedTrade = normalizeTrade(payload.data);

          if (normalizedTrade) {
            setTrades((currentTrades) => [normalizedTrade, ...currentTrades].slice(0, 20));
          }
        }
      };

      socket.onclose = () => {
        if (mounted) {
          setStatus("Disconnected");
        }
      };

      socket.onerror = () => {
        if (mounted) {
          setStatus("Connection error");
        }
      };
    } catch {
      setStatus("WebSocket unavailable");
    }

    return () => {
      mounted = false;
      socket?.close();
    };
  }, [selectedSymbol]);

  useEffect(() => {
    if (orderType === "LIMIT" && price === "0" && ticker !== null) {
      setPrice(String(ticker));
    }
  }, [orderType, price, ticker]);

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    setMessage(null);

    const numericQuantity = Number(quantity);
    const numericPrice = orderType === "MARKET" ? (ticker ?? 0) + 100 : Number(price);

    try {
      const response = await fetch(`${API_BASE}/trades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: orderSide,
          quantity: numericQuantity,
          userId,
          price: numericPrice,
        }),
      });

      const result = await response.json();
      setMessage(`Order submitted: ${result?.status ?? "ok"}`);
    } catch {
      setMessage("Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#13213d_0%,#08111f_45%,#050914_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
          <ChartPlaceholder symbol={selectedSymbol} />

          <div className="flex shrink-0 flex-col gap-4">
            <div className="flex items-center justify-between border border-white/10 bg-black/20 px-5 py-3 text-sm text-slate-400 backdrop-blur" style={{ borderRadius: 24 }}>
              <div>
                <span className="text-slate-500">Market</span>
                <span className="ml-2 font-semibold text-slate-100">{selectedSymbol}</span>
              </div>
            </div>

            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_260px]">
              <OrderbookTradesPanel symbol={selectedSymbol} ticker={ticker} depth={depth} trades={trades} />
              <OrderTicket
                symbol={selectedSymbol}
                ticker={ticker}
                account={account}
                orderSide={orderSide}
                setOrderSide={setOrderSide}
                orderType={orderType}
                setOrderType={setOrderType}
                quantity={quantity}
                setQuantity={setQuantity}
                price={price}
                setPrice={setPrice}
                userId={userId}
                setUserId={setUserId}
                submitting={submitting}
                message={message}
                onSubmit={handlePlaceOrder}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
