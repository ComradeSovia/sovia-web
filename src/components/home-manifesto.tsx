export function HomeManifesto() {
  return (
    <div className="manifesto grid gap-8 md:grid-cols-[14rem_1fr]">
      <div className="space-y-4">
        <div className="inline-block bg-black px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#f4ecd6]">
          About Our Department
        </div>
        <div className="bg-black p-5 text-5xl font-black leading-none text-[#f4ecd6]">
          05
          <br />
          THESIS
        </div>
      </div>
      <div>
        <p className="text-base font-medium leading-relaxed">
          Our Department project uses <strong>music</strong> as a medium for{" "}
          <strong>reinterpretation</strong> and <strong>reconstruction</strong>.
          <br />
          <strong>Familiar melodies</strong> are reorganized and placed into{" "}
          <strong>new contexts</strong> across <strong>languages</strong> and{" "}
          <strong>styles</strong>.<br />
          <br />
          The focus extends beyond <strong>sound</strong> itself, toward the
          relationship between <strong>labor</strong>,{" "}
          <strong>collectivity</strong>, <strong>order</strong>, and{" "}
          <strong>emotion</strong>.<br />
          These works are neither <strong>replicas</strong> nor{" "}
          <strong>jokes</strong>, but{" "}
          <strong>structured thought experiments</strong> within a{" "}
          <strong>parallel reality</strong>.<br />
          <br />
          If the music feels both <strong>familiar</strong> and{" "}
          <strong>unfamiliar</strong>, then it is{" "}
          <strong>functioning as intended</strong>.<br />
        </p>
      </div>
    </div>
  );
}
