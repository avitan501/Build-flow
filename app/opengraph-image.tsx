import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Avantia Build - You Build. We Handle the Materials.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function imageDataUrl(path: string, contentType: string) {
  const data = await readFile(join(process.cwd(), "public", path));
  return `data:${contentType};base64,${data.toString("base64")}`;
}

export default async function OpenGraphImage() {
  const [jobsite, logo, regularFont, boldFont] = await Promise.all([
    imageDataUrl("images/buildflow-retail/avantia-jobsite-material-delivery-share.jpg", "image/jpeg"),
    imageDataUrl("images/avantia/avantia-build-lockup-share.png", "image/png"),
    readFile(join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts", "LiberationSans-Regular.ttf")),
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
        background: "#071126",
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
          left: 0,
          top: 0,
          bottom: 0,
          width: 720,
          display: "flex",
          background: "rgba(7,17,38,0.88)",
        }}
      />

      <div
        style={{
          width: 690,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: "54px 58px 50px 64px",
          color: "white",
        }}
      >
        <div
          style={{
            width: 355,
            height: 94,
            display: "flex",
            alignItems: "center",
            borderRadius: 18,
            background: "rgba(255,255,255,0.96)",
            padding: "14px 20px",
          }}
        >
          <img src={logo} alt="Avantia Build" width={315} height={66} style={{ width: 315, height: 66, objectFit: "contain" }} />
        </div>

        <div style={{ display: "flex", marginTop: 36, color: "#b9dcff", fontSize: 21, fontWeight: 700, letterSpacing: 3 }}>
          YOUR CONSTRUCTION MATERIALS DESK
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 14, fontSize: 66, lineHeight: 0.98, fontWeight: 700, letterSpacing: 0 }}>
          <span>You Build.</span>
          <span>We Handle</span>
          <span>the Materials.</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, maxWidth: 590, color: "#e2e8f0", fontSize: 25, lineHeight: 1.32 }}>
          Upload your plans or material list. We compare suppliers, organize the order, and coordinate jobsite delivery.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
          <div style={{ display: "flex", borderRadius: 999, background: "#ffffff", color: "#071126", padding: "11px 18px", fontSize: 18, fontWeight: 700 }}>
            Plans · Pricing · Delivery
          </div>
          <div style={{ display: "flex", color: "#dbeafe", fontSize: 18, fontWeight: 700 }}>build.avantiap.com</div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Liberation Sans", data: regularFont, weight: 400 },
        { name: "Liberation Sans", data: boldFont, weight: 700 },
      ],
    },
  );
}
