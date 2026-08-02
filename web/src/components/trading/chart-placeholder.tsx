type ChartPlaceholderProps = {
  symbol: string;
};

export function ChartPlaceholder({ symbol }: ChartPlaceholderProps) {
  return (
    <section className="min-h-[460px] flex-1 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(82,132,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(22,163,74,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-2xl shadow-black/20 backdrop-blur">
      <div className="h-full w-full rounded-[28px] border border-dashed border-white/5 bg-[linear-gradient(180deg,rgba(5,9,20,0.25),rgba(5,9,20,0.08))]" aria-hidden="true" />
      <span className="sr-only">Reserved chart space for {symbol}</span>
    </section>
  );
}
