type OrderTicketProps = {
    symbol: string;
    ticker: number | null;
    orderSide: "BUY" | "SELL";
    setOrderSide: (value: "BUY" | "SELL") => void;
    orderType: "LIMIT" | "MARKET";
    setOrderType: (value: "LIMIT" | "MARKET") => void;
    quantity: string;
    setQuantity: (value: string) => void;
    price: string;
    setPrice: (value: string) => void;
    userId: string;
    setUserId: (value: string) => void;
    submitting: boolean;
    message: string | null;
    onSubmit: () => void;
};

function toDisplayPrice(ticker: number | null, price: string, orderType: "LIMIT" | "MARKET") {
    if (orderType === "MARKET") {
        return ticker === null ? "--" : String(ticker + 100);
    }

    return price;
}

export function OrderTicket({
    symbol,
    ticker,
    orderSide,
    setOrderSide,
    orderType,
    setOrderType,
    quantity,
    setQuantity,
    price,
    setPrice,
    userId,
    setUserId,
    submitting,
    message,
    onSubmit,
}: OrderTicketProps) {
    return (
        <aside className="w-full max-w-90 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,32,0.96),rgba(10,14,24,0.98))] p-5 shadow-2xl shadow-black/25 backdrop-blur">
            <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Order ticket</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-100">{symbol}</h3>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
                <button
                    type="button"
                    onClick={() => setOrderSide("BUY")}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${orderSide === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "text-slate-400 hover:text-slate-200"}`}
                >
                    Buy / Long
                </button>
                <button
                    type="button"
                    onClick={() => setOrderSide("SELL")}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${orderSide === "SELL" ? "bg-rose-500/15 text-rose-300" : "text-slate-400 hover:text-slate-200"}`}
                >
                    Sell / Short
                </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                <button
                    type="button"
                    onClick={() => setOrderType("LIMIT")}
                    className={`rounded-2xl border px-4 py-3 font-semibold transition ${orderType === "LIMIT" ? "border-white/10 bg-white/10 text-slate-100" : "border-white/5 bg-black/20 text-slate-500"}`}
                >
                    Limit
                </button>
                <button
                    type="button"
                    onClick={() => setOrderType("MARKET")}
                    className={`rounded-2xl border px-4 py-3 font-semibold transition ${orderType === "MARKET" ? "border-white/10 bg-white/10 text-slate-100" : "border-white/5 bg-black/20 text-slate-500"}`}
                >
                    Market
                </button>
            </div>

            <div className="mt-5 space-y-4">
                {orderType === "LIMIT" && <label className="block">
                    <span className="mb-2 block text-sm text-slate-400">Price (INR)</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                        <input
                            type="number"
                            min="0"
                            value={toDisplayPrice(ticker, price, orderType)}
                            onChange={(event) => setPrice(event.target.value)}
                            className="w-full bg-transparent text-lg text-slate-100 outline-none disabled:cursor-not-allowed"
                        />
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">INR</span>
                    </div>
                </label>}


                <label className="block">
                    <span className="mb-2 block text-sm text-slate-400">Quantity (TATA)</span>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(event) => setQuantity(event.target.value)}
                            className="w-full bg-transparent text-lg text-slate-100 outline-none"
                        />
                    </div>
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm text-slate-400">User ID</span>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                        <input
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                            className="w-full bg-transparent text-base text-slate-100 outline-none"
                        />
                    </div>
                </label>

                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={submitting}
                    className="w-full rounded-2xl bg-linear-to-r from-cyan-400 to-blue-500 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {submitting ? "Submitting..." : `Place ${orderSide} order`}
                </button>

                {message ? (
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-200">
                        {message}
                    </div>
                ) : null}
            </div>
        </aside>
    );
}
