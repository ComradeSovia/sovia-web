export function RaysBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[conic-gradient(from_210deg,rgba(255,215,0,0.14)_0deg,rgba(255,215,0,0.00)_14deg,rgba(255,215,0,0.14)_28deg)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.10)_0%,rgba(0,0,0,0.45)_55%,rgba(0,0,0,0.70)_100%)]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] bg-size-[10px_10px]" />
    </div>
  );
}
