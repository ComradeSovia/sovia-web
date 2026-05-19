import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f4ecd6",
        color: "#111111",
        border: "24px solid #111111",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: 56,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        <span>Sound Archive</span>
        <span style={{ color: "#b91c1c" }}>YouTube Music</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 104,
            lineHeight: 0.92,
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            width: 760,
            borderTop: "10px solid #b91c1c",
            paddingTop: 24,
            fontSize: 34,
            lineHeight: 1.25,
            fontWeight: 800,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>

      <div
        style={{
          height: 34,
          width: "100%",
          background: "#f5c400",
          border: "6px solid #111111",
        }}
      />
    </div>,
    size,
  );
}
