import { chromium } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3100";
const isPhone = process.env.DEMO_VARIANT === "phone";
const assetSuffix = isPhone ? "-phone" : "";
const outputDir = join(process.cwd(), "public", "videos");
const outputWebm = join(outputDir, `avantia-materials-demo${assetSuffix}.webm`);
const outputMp4 = join(outputDir, `avantia-materials-demo${assetSuffix}.mp4`);
const outputPoster = join(outputDir, `avantia-materials-demo${assetSuffix}-poster.png`);
const outputCaptions = join(outputDir, `avantia-materials-demo${assetSuffix}.vtt`);
const recordingDir = await mkdtemp(join(tmpdir(), "avantia-real-demo-"));
const rawVideo = join(recordingDir, `avantia-materials-demo${assetSuffix}-raw.webm`);

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: isPhone ? { width: 450, height: 800 } : { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  isMobile: isPhone,
  hasTouch: isPhone,
  recordVideo: {
    dir: recordingDir,
    size: isPhone ? { width: 450, height: 800 } : { width: 1280, height: 720 },
  },
});

const page = await context.newPage();
const recordingStartedAt = Date.now();

// Playwright's video capture does not include the operating-system pointer.
// This small overlay follows real mouse events so the recording reads like a
// person using the site rather than an automated slideshow.
await page.addInitScript(() => {
  const installCursor = () => {
    if (document.querySelector("[data-demo-cursor]")) return;

    const cursor = document.createElement("div");
    cursor.dataset.demoCursor = "true";
    cursor.setAttribute("aria-hidden", "true");
    cursor.style.cssText = [
      "position:fixed",
      "left:0",
      "top:0",
      "z-index:2147483647",
      "width:22px",
      "height:29px",
      "pointer-events:none",
      "opacity:0",
      "transform:translate3d(-40px,-40px,0)",
      "transition:opacity 120ms ease",
      "filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))",
      "background-repeat:no-repeat",
      "background-size:contain",
      `background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 30'%3E%3Cpath d='M2 1.5v22.2l5.9-5.2 4.2 9.4 4-1.8-4.1-9.2 7.8-.8L2 1.5Z' fill='%23fff' stroke='%23071126' stroke-width='1.7' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    ].join(";");
    document.documentElement.append(cursor);

    document.addEventListener(
      "mousemove",
      (event) => {
        cursor.style.opacity = "1";
        cursor.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
      },
      { passive: true },
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installCursor, { once: true });
  } else {
    installCursor();
  }
});

let cursorX = 48;
let cursorY = 84;

async function pause(milliseconds) {
  await page.waitForTimeout(milliseconds);
}

async function moveCursorTo(locator, duration = 430) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Could not locate ${await locator.toString()}`);

  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;
  const distance = Math.hypot(targetX - cursorX, targetY - cursorY);
  const steps = Math.max(16, Math.round(distance / 24));
  const startX = cursorX;
  const startY = cursorY;

  for (let step = 1; step <= steps; step += 1) {
    const raw = step / steps;
    const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
    const arc = Math.sin(raw * Math.PI) * Math.min(11, distance / 40);
    const x = startX + (targetX - startX) * eased + arc;
    const y = startY + (targetY - startY) * eased - arc * 0.35;
    await page.mouse.move(x, y);
    await pause(duration / steps);
  }

  cursorX = targetX;
  cursorY = targetY;
}

async function humanClick(locator, settle = 280) {
  await moveCursorTo(locator);
  await pause(95);
  await page.mouse.down();
  await pause(70);
  await page.mouse.up();
  await pause(settle);
}

await page.goto(`${baseUrl}/shop/framing`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Framing Lumber Quick Order" }).waitFor();

const size = page.getByLabel("Lumber size");
await size.selectOption({ label: "2x4" });
const length = page.getByLabel("Length");
await length.selectOption({ label: "10 ft." });

const quantity = page.getByLabel("Quantity");
await quantity.fill("");
await moveCursorTo(quantity, 280);
await quantity.focus();
await page.screenshot({ path: outputPoster, type: "png" });
const trimStartSeconds = Math.max(0, (Date.now() - recordingStartedAt) / 1000 - 0.12);
await quantity.pressSequentially("120", { delay: 105 });
await pause(240);

const douglasFir = page.getByLabel("Douglas Fir");
await humanClick(douglasFir, 280);

const notes = page.getByLabel("Any plywood, hardware, grade, or delivery notes?");
await humanClick(notes, 130);
await notes.pressSequentially("Add 40 sheets 7/16 OSB. Deliver to rear driveway.", { delay: 23 });
await pause(300);

const review = page.getByRole("button", { name: isPhone ? "Review" : "Review Request", exact: true });
await humanClick(review, 180);
await page.getByRole("heading", { name: "Review Your Request" }).waitFor();
await pause(350);

// Lift the real review card into focus so the completed order reads as a
// pop-up while preserving the exact website typography and content.
await page.evaluate((phoneLayout) => {
  const heading = [...document.querySelectorAll("h3")].find((element) => element.textContent?.includes("Review Your Request"));
  let card = heading;
  while (card && !(card.tagName === "SECTION" && card.classList.contains("overflow-hidden"))) {
    card = card.parentElement;
  }
  if (!card) throw new Error("Could not find the real request review card");

  const backdrop = document.createElement("div");
  backdrop.dataset.demoBackdrop = "true";
  backdrop.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(7,17,38,.72);backdrop-filter:blur(3px);opacity:0;transition:opacity 220ms ease";
  document.body.append(backdrop);

  const horizontalMargin = phoneLayout ? 24 : 64;
  const verticalMargin = phoneLayout ? 28 : 48;
  card.style.cssText += `;position:fixed;left:50%;top:50%;z-index:2147483001;width:min(860px,calc(100vw - ${horizontalMargin}px));max-height:calc(100vh - ${verticalMargin}px);overflow:auto;transform:translate(-50%,-47%) scale(.97);opacity:0;box-shadow:0 30px 90px rgba(0,0,0,.38);transition:opacity 220ms ease,transform 260ms ease`;
  requestAnimationFrame(() => {
    backdrop.style.opacity = "1";
    card.style.opacity = "1";
    card.style.transform = "translate(-50%,-50%) scale(1)";
  });
}, isPhone);
await pause(1750);

// End on the real Avantia lockup with a restrained brand card.
await page.evaluate((logoUrl) => {
  const cursor = document.querySelector("[data-demo-cursor]");
  if (cursor instanceof HTMLElement) cursor.style.opacity = "0";

  const endCard = document.createElement("div");
  endCard.dataset.demoEndCard = "true";
  endCard.style.cssText = "position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;background:#f7f8fa;opacity:0;transition:opacity 240ms ease";
  endCard.innerHTML = `<div style="max-width:88vw;text-align:center"><img src="${logoUrl}" alt="" style="display:block;width:min(430px,72vw);height:auto;margin:0 auto"><p style="margin:24px 0 0;color:#071126;font:700 clamp(18px,4.8vw,22px)/1.35 'Avenir Next','Segoe UI',sans-serif;letter-spacing:-.02em">You build. We handle the materials.</p><p style="margin:8px 0 0;color:#617187;font:500 clamp(13px,3.6vw,15px)/1.5 'Avenir Next','Segoe UI',sans-serif">Plans, pricing, ordering, and jobsite delivery.</p></div>`;
  document.body.append(endCard);
  requestAnimationFrame(() => {
    endCard.style.opacity = "1";
  });
}, `${baseUrl}/images/avantia/avantia-build-lockup-navy.webp`);
await pause(2450);

const video = page.video();
await context.close();
await video.saveAs(rawVideo);
await browser.close();

await promisify(execFile)("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-ss",
  trimStartSeconds.toFixed(3),
  "-i",
  rawVideo,
  "-t",
  "19.5",
  "-an",
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-crf",
  "22",
  ...(isPhone ? ["-vf", "scale=720:1280:flags=lanczos"] : []),
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  outputMp4,
]);

await promisify(execFile)("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-ss",
  trimStartSeconds.toFixed(3),
  "-i",
  rawVideo,
  "-t",
  "19.5",
  "-an",
  "-c:v",
  "libvpx",
  "-crf",
  "24",
  "-b:v",
  "1M",
  ...(isPhone ? ["-vf", "scale=720:1280:flags=lanczos"] : []),
  outputWebm,
]);

const captions = `WEBVTT

00:00:00.000 --> 00:00:05.800
Enter a fast framing order on the real Avantia Build form.

00:00:05.800 --> 00:00:08.100
Review the completed order details.

00:00:08.100 --> 00:00:${isPhone ? "10.360" : "10.560"}
Avantia Build. You build. We handle the materials.
`;

await writeFile(outputCaptions, captions, "utf8");

console.log(`Created ${outputMp4}`);
console.log(`Created ${outputWebm}`);
console.log(`Created ${outputPoster}`);
console.log(`Created ${outputCaptions}`);
