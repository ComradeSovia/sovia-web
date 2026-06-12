export function RaysBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-paper" />
      <div className="absolute -left-[18vw] top-0 h-[120vh] w-[48vw] -skew-x-12 bg-red" />
      <div className="absolute right-[-20vw] top-[-14vh] h-[50vh] w-[72vw] -rotate-12 bg-block" />
      <div className="absolute bottom-[-16vh] left-[30vw] h-[34vh] w-[76vw] -rotate-12 bg-yellow" />
      <div className="theme-grid absolute inset-0 opacity-[0.18]" />
      <div className="theme-hatch absolute inset-0 opacity-[0.12]" />
    </div>
  );
}
