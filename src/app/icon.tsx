import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#b91c1c",
        color: "#f4ecd6",
        border: "6px solid #111111",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 36,
        fontWeight: 900,
      }}
    >
      S
    </div>,
    size,
  );
}
