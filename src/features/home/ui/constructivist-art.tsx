/** Decorative artwork: keep all geometry and palette defaults in this module. */
export type ConstructivistArtVariant =
  | "monument"
  | "archive"
  | "record"
  | "structure"
  | "frames"
  | "network"
  | "envelope";

export type ConstructivistArtProps = {
  variant: ConstructivistArtVariant;
  className?: string;
};

const palette = {
  accent: "var(--art-accent, var(--design-accent, #e04432))",
  paper: "var(--art-paper, #f0eee5)",
  grooves: "var(--art-grooves, #526151)",
} as const;

function Composition({ variant }: { variant: ConstructivistArtVariant }) {
  switch (variant) {
    case "monument":
      return (
        <>
          <circle
            className="sculpture-orbit"
            cx="310"
            cy="310"
            r="240"
            stroke="currentColor"
            strokeOpacity=".2"
            strokeDasharray="2 10"
          />
          <circle
            cx="310"
            cy="310"
            r="192"
            stroke="currentColor"
            strokeOpacity=".16"
          />
          <path
            d="M30 310H580M310 30V620"
            stroke="currentColor"
            strokeOpacity=".12"
          />
          <g className="sculpture-structure">
            <circle cx="348" cy="230" r="151" fill={palette.accent} />
            <circle
              cx="348"
              cy="230"
              r="117"
              stroke={palette.paper}
              strokeOpacity=".25"
            />
            <path d="M75 480 385 93 434 133 124 520Z" fill="#eeece3" />
            <path d="m124 520 310-387 12 49-310 387Z" fill="#9e9e97" />
            <path d="m152 492 200-250 96 78-200 250Z" fill="#2a2c2a" />
            <path d="m248 570 200-250 24 28-200 250Z" fill="#090b0a" />
            <path d="m50 386 455-89 9 45-455 89Z" fill={palette.accent} />
            <path d="m59 431 455-89-7 18-455 89Z" fill="#963527" />
            <path d="m193 181 252 206-17 21-252-206Z" fill="#e8e5d9" />
          </g>
          <path d="M78 557H519" stroke="currentColor" strokeOpacity=".3" />
          <path
            d="M78 551v12m441-12v12M515 72v30m-15-15h30"
            stroke="currentColor"
          />
          <circle cx="310" cy="310" r="5" fill="#edc783" />
        </>
      );
    case "archive":
      return (
        <g transform="rotate(-12 200 90)">
          <path fill={palette.paper} d="M102 12h188v165H102z" />
          <path fill={palette.accent} d="M102 12h18v165h-18z" />
          <path
            d="M143 49h111M143 69h92M143 89h111M143 109h66M143 140h38"
            stroke="currentColor"
            strokeWidth="4"
          />
          <circle fill={palette.accent} cx="284" cy="148" r="34" />
          <path
            d="m272 149 8 8 17-21"
            stroke={palette.paper}
            strokeWidth="3"
            fill="none"
          />
        </g>
      );
    case "record":
      return (
        <>
          <circle cx="225" cy="91" r="85" fill="currentColor" />
          <g stroke={palette.grooves} fill="none" strokeWidth="1">
            <circle cx="225" cy="91" r="73" />
            <circle cx="225" cy="91" r="62" />
            <circle cx="225" cy="91" r="51" />
          </g>
          <circle fill={palette.accent} cx="225" cy="91" r="32" />
          <circle fill={palette.paper} cx="225" cy="91" r="6" />
          <path fill={palette.accent} d="m61 34 76-15v118l-76 15z" />
          <path
            d="M78 60v58m15-71v62m15-50v40m15-46v55"
            stroke={palette.paper}
            strokeWidth="3"
          />
        </>
      );
    case "structure":
      return (
        <>
          <circle fill={palette.accent} cx="245" cy="71" r="61" />
          <path fill={palette.paper} d="m113 151 91-135 41 28-91 135z" />
          <path d="m157 178 91-135 9 26-91 135z" fill="currentColor" />
          <path d="m91 110 234-43 5 25-234 43z" fill="currentColor" />
          <circle
            cx="204"
            cy="91"
            r="81"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".25"
          />
        </>
      );
    case "frames":
      return (
        <g transform="rotate(-8 200 90)">
          <path
            d="M98 16h196v126H98z"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".3"
          />
          <path fill={palette.paper} d="M83 34h196v126H83z" />
          <path d="M94 46h174v101H94z" fill="currentColor" />
          <circle fill={palette.accent} cx="229" cy="76" r="24" />
          <path fill={palette.accent} d="m94 147 67-64 66 64z" />
          <path fill={palette.paper} d="m160 147 48-42 60 42z" />
          <path fill={palette.accent} d="m291 78 31 20-31 20z" />
        </g>
      );
    case "network":
      return (
        <>
          <path
            d="m111 63 87 63 92-77M198 126l69 27M111 63l88-40 91 26"
            stroke="currentColor"
            strokeOpacity=".4"
            strokeWidth="2"
          />
          <circle fill={palette.accent} cx="198" cy="126" r="34" />
          <circle fill={palette.paper} cx="111" cy="63" r="27" />
          <circle cx="290" cy="49" r="24" fill="currentColor" />
          <circle fill={palette.accent} cx="199" cy="23" r="11" />
          <circle fill={palette.paper} cx="267" cy="153" r="14" />
          <circle
            cx="198"
            cy="126"
            r="49"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".25"
            strokeDasharray="3 5"
          />
        </>
      );
    case "envelope":
      return (
        <g transform="rotate(-10 200 90)">
          <path fill={palette.paper} d="M94 32h211v129H94z" />
          <path
            d="m94 32 105 81L305 32M94 161l78-69m133 69-78-69"
            stroke="currentColor"
            strokeOpacity=".6"
            strokeWidth="2"
            fill="none"
          />
          <path fill={palette.accent} d="M271 15h49v49h-49z" />
          <path
            d="M283 51l25-25m-25 0h25v25"
            stroke={palette.paper}
            strokeWidth="2"
            fill="none"
          />
        </g>
      );
  }
}

export function ConstructivistArt({
  variant,
  className,
}: ConstructivistArtProps) {
  return (
    <svg
      className={className}
      data-art={variant}
      viewBox={variant === "monument" ? "0 0 600 650" : "0 0 400 180"}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <Composition variant={variant} />
    </svg>
  );
}
