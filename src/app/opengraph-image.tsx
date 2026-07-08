import { SITE_NAME, SITE_TITLE } from "@sovia/shared";
import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  const subtitle = SITE_TITLE.replace(`${SITE_NAME} | `, "");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#f4ecd6",
        color: "#111111",
        fontFamily: "Arial, Helvetica, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 24,
          border: "18px solid #111111",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 66,
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            background: "#b91c1c",
            border: "5px solid #111111",
          }}
        />
        <span>Sovia Archive</span>
      </div>

      <div
        style={{
          position: "absolute",
          right: 68,
          top: 62,
          width: 250,
          height: 250,
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(8deg)",
          border: "14px solid #b91c1c",
          color: "#b91c1c",
          display: "flex",
          flexDirection: "column",
          fontSize: 34,
          fontWeight: 900,
          lineHeight: 0.95,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        Music
        <br />
        Creative
        <br />
        Works
      </div>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 160,
          width: 760,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            fontSize: 118,
            display: "flex",
            flexDirection: "column",
            lineHeight: 0.86,
            fontWeight: 900,
            letterSpacing: -2,
            textTransform: "uppercase",
          }}
        >
          Comrade
          <br />
          Sovia
        </div>

        <div
          style={{
            width: 690,
            padding: "14px 18px",
            background: "#111111",
            color: "#f4ecd6",
            fontSize: 38,
            lineHeight: 1.1,
            fontWeight: 900,
          }}
        >
          {subtitle}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "#f5c400",
          border: "6px solid #111111",
          fontSize: 28,
          fontWeight: 900,
          textTransform: "uppercase",
        }}
      >
        <span>sovia.work</span>
        <span style={{ color: "#b91c1c" }}>Music / Visual Works / Tools</span>
      </div>

      <div
        style={{
          position: "absolute",
          right: -24,
          bottom: -36,
          width: 230,
          height: 90,
          transform: "rotate(-14deg)",
          background: "#b91c1c",
          border: "8px solid #111111",
        }}
      />
    </div>,
    size,
  );
}
