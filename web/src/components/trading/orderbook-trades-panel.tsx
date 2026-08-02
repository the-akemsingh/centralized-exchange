"use client";

import { useMemo, useState } from "react";
import type { DepthState, TradeState } from "./types";

type OrderbookTradesPanelProps = {
    symbol: string;
    ticker: number | null;
    depth: DepthState;
    trades: TradeState[];
};

type BookRow = {
    price: number;
    quantity: number;
    total: number;
};

function formatPrice(value: number, symbol?: string) {
    return Number.isFinite(value)
        ? ` ${symbol?.split("_")[1] || ""}  ${value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
        : "--";
}

function formatQuantity(value: number) {
    return Number.isFinite(value)
        ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
        : "--";
}

function buildBookRows(levels: [string, string][], direction: "asc" | "desc") {
    return levels
        .map(([levelPrice, levelQuantity]) => {
            const price = Number(levelPrice);
            const quantity = Number(levelQuantity);

            return {
                price,
                quantity,
                total: price * quantity,
            } satisfies BookRow;
        })
        .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.quantity))
        .sort((left, right) => (direction === "asc" ? left.price - right.price : right.price - left.price))
        .slice(0, 8);
}

export function OrderbookTradesPanel({ symbol, ticker, depth, trades }: OrderbookTradesPanelProps) {
    const [activeTab, setActiveTab] = useState<"BOOK" | "TRADES">("BOOK");

    const askRows = useMemo(() => buildBookRows(depth.asks, "asc"), [depth.asks]);
    const bidRows = useMemo(() => buildBookRows(depth.bids, "desc"), [depth.bids]);

    return (
        <section className="w-full max-w-96 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,32,0.96),rgba(10,14,24,0.98))] p-4 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Market</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-100">{symbol}</h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Last</div>
                    <div className="text-lg font-semibold text-slate-100">{ticker === null ? "--" : formatPrice(ticker, symbol)}</div>
                </div>
            </div>

            <div className="mt-4 inline-flex rounded-2xl border border-white/10 bg-black/20 p-1 text-sm">
                <button
                    type="button"
                    onClick={() => setActiveTab("BOOK")}
                    className={`rounded-xl px-4 py-2 font-semibold transition ${activeTab === "BOOK" ? "bg-white/10 text-slate-100" : "text-slate-400 cursor-pointer hover:text-slate-200"}`}
                >
                    Book
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("TRADES")}
                    className={`rounded-xl px-4 py-2 cursor-pointer font-semibold transition ${activeTab === "TRADES" ? "bg-white/10 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                >
                    Trades
                </button>
            </div>

            {activeTab === "BOOK" ? (
                <div className="mt-4">
                    <div className="grid grid-cols-[1fr_0.8fr_0.9fr] gap-3 border-b border-white/5 px-2 pb-2 text-[11px] uppercase tracking-[0.25em] text-slate-500">
                        <span>Price (INR)</span>
                        <span className="text-right">Size (TATA)</span>
                        <span className="text-right">Total (INR)</span>
                    </div>

                    <div className="mt-2 space-y-1">
                        {askRows.length > 0 ? (
                            askRows
                                .slice()
                                .reverse()
                                .map((row) => (
                                    <div key={`ask-${row.price}-${row.quantity}`} className="grid grid-cols-[1fr_0.8fr_0.9fr] items-center gap-3 rounded-2xl px-2 py-1.5 text-sm">
                                        <span className="font-medium text-rose-400">{formatPrice(row.price)}</span>
                                        <span className="text-right text-slate-200">{formatQuantity(row.quantity)}</span>
                                        <span className="text-right text-slate-400">{formatPrice(row.total)}</span>
                                    </div>
                                ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">
                                No asks yet.
                            </div>
                        )}
                    </div>

                    <div className="my-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                        <span className="text-sm text-slate-400">{symbol}</span>
                        <span className="text-xl font-semibold text-slate-100">{ticker === null ? "--" : formatPrice(ticker)}</span>
                    </div>

                    <div className="space-y-1">
                        {bidRows.length > 0 ? (
                            bidRows.map((row) => (
                                <div key={`bid-${row.price}-${row.quantity}`} className="grid grid-cols-[1fr_0.8fr_0.9fr] items-center gap-3 rounded-2xl px-2 py-1.5 text-sm">
                                    <span className="font-medium text-emerald-400">{formatPrice(row.price)}</span>
                                    <span className="text-right text-slate-200">{formatQuantity(row.quantity)}</span>
                                    <span className="text-right text-slate-400">{formatPrice(row.total)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">
                                No bids yet.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mt-4">
                    <div className="grid grid-cols-[1fr_0.8fr_0.9fr] gap-3 border-b border-white/5 px-2 pb-2 text-[11px] uppercase tracking-[0.25em] text-slate-500">
                        <span>Price (INR)</span>
                        <span className="text-right">Qty (TATA)</span>
                        <span className="text-right">Side</span>
                    </div>

                    <div className="max-h-105 space-y-1 scrollbar-none overflow-y-auto pt-2">
                        {trades.length > 0 ? (
                            trades.map((trade, index) => {
                                const side = (trade.side ?? "--").toUpperCase();
                                const sideClass = side === "BUY" ? "text-emerald-400" : side === "SELL" ? "text-rose-400" : "text-slate-400";

                                return (
                                    <div key={`${trade.orderId ?? "trade"}-${index}`} className="grid grid-cols-[1fr_0.7fr_0.7fr] items-center gap-3 rounded-2xl px-2 py-2 text-sm">
                                        <span className="font-medium text-slate-100">{formatPrice(trade.price)}</span>
                                        <span className="text-right text-slate-200">{formatQuantity(trade.quantity)}</span>
                                        <span className={`text-right font-semibold ${sideClass}`}>{side}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">
                                No trades yet.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
