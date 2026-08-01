"use client";

import { useEffect, useState } from "react";

type DepthState = {
  bids: [string, string][];
  asks: [string, string][];
};

type TradeState = {
  price: number;
  quantity: number;
  side?: string;
  userId?: string;
  orderId?: string;
};

const SYMBOL = "TATA_INR";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3005";

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOL);
  const [ticker, setTicker] = useState<number | null>(null);
  const [depth, setDepth] = useState<DepthState>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<TradeState[]>([]);
  const [status, setStatus] = useState("Disconnected");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("0");
  const [userId, setUserId] = useState("demo-user");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (orderType === "MARKET") {
      const currentPrice = (ticker ?? Number(price)) || 0;
      setPrice(String(currentPrice + 100));
    }
  }, [orderType, ticker]);

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
          setTrades(tradesData);
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
          setTrades((currentTrades) => [payload.data as TradeState, ...currentTrades].slice(0, 20));
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
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
        <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Exchange terminal</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Client-side order desk</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">API: {API_BASE}</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">WS: {status}</span>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tickers</p>
            <button
              type="button"
              onClick={() => setSelectedSymbol(SYMBOL)}
              className={`mt-4 flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                selectedSymbol === SYMBOL
                  ? "border-cyan-400/50 bg-cyan-400/10"
                  : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <div>
                <div className="text-lg font-semibold">{SYMBOL}</div>
                <div className="text-sm text-slate-400">Spot market</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Last</div>
                <div className="text-lg font-semibold text-cyan-300">{ticker ?? "--"}</div>
              </div>
            </button>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Market</p>
                <h2 className="mt-2 text-3xl font-semibold">{selectedSymbol}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Ticker</div>
                  <div className="mt-1 text-xl font-semibold text-cyan-300">{ticker ?? "--"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Bids</div>
                  <div className="mt-1 text-xl font-semibold">{depth.bids.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Trades</div>
                  <div className="mt-1 text-xl font-semibold">{trades.length}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">Orderbook bids</h3>
                  <span className="text-xs text-slate-400">Price / Qty</span>
                </div>
                <div className="mt-4 space-y-2">
                  {depth.bids.length > 0 ? (
                    depth.bids.slice(0, 8).map(([levelPrice, levelQuantity]) => (
                      <div key={`${levelPrice}-${levelQuantity}`} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-sm">
                        <span className="text-emerald-200">{levelPrice}</span>
                        <span className="text-slate-200">{levelQuantity}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-slate-400">
                      No bid levels yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-400/15 bg-rose-400/5 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-200">Orderbook asks</h3>
                  <span className="text-xs text-slate-400">Price / Qty</span>
                </div>
                <div className="mt-4 space-y-2">
                  {depth.asks.length > 0 ? (
                    depth.asks.slice(0, 8).map(([levelPrice, levelQuantity]) => (
                      <div key={`${levelPrice}-${levelQuantity}`} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-sm">
                        <span className="text-rose-200">{levelPrice}</span>
                        <span className="text-slate-200">{levelQuantity}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-slate-400">
                      No ask levels yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">Recent trades</h3>
                <span className="text-xs text-slate-400">Latest 20</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                <div className="max-h-80 divide-y divide-white/5 overflow-y-auto">
                  {trades.length > 0 ? (
                    trades.map((trade, index) => (
                      <div key={`${trade.orderId ?? "trade"}-${index}`} className="grid grid-cols-4 gap-3 px-4 py-3 text-sm">
                        <span className="text-cyan-200">{trade.price ?? "--"}</span>
                        <span>{trade.quantity ?? "--"}</span>
                        <span>{trade.side ?? "--"}</span>
                        <span className="text-slate-400">{trade.userId ?? "system"}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-slate-400">No trades yet.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Place order</p>
              <h3 className="mt-2 text-2xl font-semibold">{selectedSymbol}</h3>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Side</span>
                <select
                  value={orderSide}
                  onChange={(event) => setOrderSide(event.target.value as "BUY" | "SELL")}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60"
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Order type</span>
                <select
                  value={orderType}
                  onChange={(event) => setOrderType(event.target.value as "LIMIT" | "MARKET")}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60"
                >
                  <option value="LIMIT">LIMIT</option>
                  <option value="MARKET">MARKET</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Quantity</span>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Price</span>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  disabled={orderType === "MARKET"}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Market order uses current ticker + 100 as the limit price.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">User ID</span>
                <input
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60"
                />
              </label>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={submitting}
                className="mt-2 w-full rounded-2xl bg-linear-to-r from-cyan-400 to-blue-500 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Submitting..." : "Place order"}
              </button>

              {message ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-200">
                  {message}
                </div>
              ) : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
