import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Avantia Build construction material sourcing and jobsite delivery";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function imageDataUrl(path: string, contentType: string) {
  const data = await readFile(join(process.cwd(), "public", path));
  return `data:${contentType};base64,${data.toString("base64")}`;
}

export default async function OpenGraphImage() {
  const [jobsite, logo, boldFont] = await Promise.all([
    imageDataUrl("images/buildflow-retail/hero.jpg", "image/jpeg"),
    imageDataUrl("images/avantia/avantia-build-lockup-share.png", "image/png"),
    readFile(join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts", "LiberationSans-Bold.ttf")),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#f4f6f8",
        fontFamily: "Liberation Sans",
      }}
    >
      <img
        src={jobsite}
        alt=""
        width={1200}
        height={630}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          left: 46,
          top: 40,
          width: 430,
          height: 116,
          display: "flex",
          alignItems: "center",
          borderRadius: 22,
          background: "rgba(255,255,255,0.96)",
          padding: "17px 25px",
          boxShadow: "0 12px 34px rgba(7,17,38,0.20)",
        }}
      >
        <img src={logo} alt="Avantia Build" width={380} height={82} style={{ width: 380, height: 82, objectFit: "contain" }} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 46,
          bottom: 38,
          display: "flex",
          alignItems: "center",
          borderRadius: 999,
          background: "rgba(7,17,38,0.92)",
          color: "white",
          padding: "13px 22px",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 1.2,
          boxShadow: "0 10px 28px rgba(7,17,38,0.24)",
        }}
      >
        PLANS · PRICING · JOBSITE DELIVERY
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Liberation Sans", data: boldFont, weight: 700 },
      ],
    },
  );
}
