"use client";

import { CandlestickSeries, ColorType, createChart, type CandlestickData, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

type ChartPlaceholderProps = {
  symbol: string;
};

type KlineResponse = {
  time: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string;
};

function intervalLabel(symbol: string) {
  const [baseAsset, quoteAsset] = symbol.split("_");
  return `${baseAsset}/${quoteAsset}`;
}

function toCandles(rows: KlineResponse[]): CandlestickData<UTCTimestamp>[] {
  return rows
    .map((row) => {
      const time = Math.floor(new Date(row.time).getTime() / 1000) as UTCTimestamp;

      return {
        time,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
      } satisfies CandlestickData;
    })
    .filter((row) => Number.isFinite(row.time) && Number.isFinite(row.open) && Number.isFinite(row.high) && Number.isFinite(row.low) && Number.isFinite(row.close));
}

export function ChartPlaceholder({ symbol }: ChartPlaceholderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [interval, setInterval] = useState<"1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d">("1h");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let cancelled = false;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.12)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.12)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    });

    observer.observe(container);
    resizeObserverRef.current = observer;

    const loadCandles = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const endTime = Date.now();
        const startTime = endTime - 30 * 24 * 60 * 60 * 1000;
        const response = await fetch(
          `${apiBase}/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&startTime=${startTime}&endTime=${endTime}&limit=500`,
        );

        if (!response.ok) {
          throw new Error("Failed to load candles");
        }

        const payload = (await response.json()) as KlineResponse[];

        if (cancelled) {
          return;
        }

        const candles = toCandles(Array.isArray(payload) ? payload : []);
        candleSeries.setData(candles);

        if (candles.length > 0) {
          chart.timeScale().fitContent();
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Chart data is unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCandles();

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      seriesRef.current = null;
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, interval]);

  const intervalOptions: { label: string; value: typeof interval }[] = [
    { label: "1m", value: "1m" },
    { label: "5m", value: "5m" },
    { label: "15m", value: "15m" },
    { label: "30m", value: "30m" },
    { label: "1h", value: "1h" },
    { label: "4h", value: "4h" },
    { label: "1d", value: "1d" },
  ];

  return (
    <section className="relative min-h-120 flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(82,132,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(22,163,74,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-2xl shadow-black/20 backdrop-blur">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {isLoading || errorMessage ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[28px] border border-dashed border-white/5 bg-[linear-gradient(180deg,rgba(5,9,20,0.25),rgba(5,9,20,0.08))] px-6 text-center text-sm text-slate-400">
          <div>
            <div className="text-base font-semibold text-slate-200">{intervalLabel(symbol)}</div>
            <div className="mt-2">{errorMessage ?? "Loading chart…"}</div>
          </div>
        </div>
      ) : null}

      <div className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold tracking-[0.25em] text-slate-300 backdrop-blur">
        TradingView Charts
      </div>

      <div className="absolute right-4 top-4 z-20 flex flex-wrap gap-2 rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur">
        {intervalOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setInterval(option.value)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${interval === option.value ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <span className="sr-only">Trading chart for {symbol}</span>
    </section>
  );
}
