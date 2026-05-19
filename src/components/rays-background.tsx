export function RaysBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[#f4ecd6]" />
      <div className="absolute -left-[18vw] top-0 h-[120vh] w-[48vw] -skew-x-12 bg-red-700" />
      <div className="absolute right-[-20vw] top-[-14vh] h-[50vh] w-[72vw] -rotate-12 bg-black" />
      <div className="absolute bottom-[-16vh] left-[30vw] h-[34vh] w-[76vw] -rotate-12 bg-[#f5c400]" />
      <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(90deg,rgba(17,17,17,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(17,17,17,0.12)_1px,transparent_1px)] bg-size-[42px_42px]" />
      <div className="absolute inset-0 opacity-[0.12] bg-[repeating-linear-gradient(135deg,rgba(17,17,17,0.9)_0_2px,transparent_2px_18px)]" />
    </div>
  );
}
