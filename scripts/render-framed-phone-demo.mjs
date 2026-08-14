import { chromium } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3100";
const isCustomRequest = process.env.DEMO_KIND === "custom";
const assetName = isCustomRequest ? "avantia-custom-request-demo" : "avantia-materials-demo-phone";
const outputDir = join(process.cwd(), "public", "videos");
const outputMp4 = join(outputDir, `${assetName}.mp4`);
const outputWebm = join(outputDir, `${assetName}.webm`);
const outputPoster = join(outputDir, `${assetName}-poster.png`);
const outputCaptions = join(outputDir, `${assetName}.vtt`);
const recordingDir = await mkdtemp(join(tmpdir(), "avantia-framed-phone-demo-"));
const rawVideo = join(recordingDir, "avantia-framed-phone-demo-raw.webm");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  recordVideo: { dir: recordingDir, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
const recordingStartedAt = Date.now();

await page.setContent(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
    body { font-family: "Avenir Next", "Segoe UI", Arial, sans-serif; color: #071126; background: #f5f7fa; }
    .scene { position: relative; width: 1280px; height: 720px; overflow: hidden; background: radial-gradient(circle at 83% 30%, rgba(242,147,29,.17), transparent 25%), linear-gradient(135deg,#f9fafc 0%,#eef4fa 100%); }
    .grid { position:absolute; inset:0; opacity:.25; background-image:linear-gradient(rgba(7,17,38,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(7,17,38,.05) 1px,transparent 1px); background-size:32px 32px; mask-image:linear-gradient(90deg,#000,transparent 66%); }
    .brand { position:absolute; left:64px; top:48px; width:205px; height:auto; }
    .copy { position:absolute; left:64px; top:157px; width:550px; }
    .eyebrow { color:#0071e3; font-size:15px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
    h1 { margin:14px 0 0; max-width:550px; font-size:54px; line-height:1.02; letter-spacing:-.045em; }
    .sub { margin:20px 0 0; max-width:485px; color:#53647a; font-size:21px; line-height:1.48; }
    .steps { display:grid; gap:11px; margin-top:34px; width:450px; }
    .step { display:flex; align-items:center; gap:13px; min-height:48px; padding:10px 14px; border:1px solid #dce4ee; border-radius:14px; background:rgba(255,255,255,.72); color:#526176; font-size:15px; font-weight:700; transition:all 260ms ease; }
    .step span { display:grid; place-items:center; width:28px; height:28px; flex:0 0 auto; border-radius:50%; background:#e8edf4; color:#68788c; }
    .step.active { border-color:#8ac6ff; background:#fff; color:#071126; box-shadow:0 12px 34px rgba(7,17,38,.09); transform:translateX(6px); }
    .step.active span { background:#0071e3; color:#fff; }
    .phone-shadow { position:absolute; right:58px; bottom:-20px; width:455px; height:120px; border-radius:50%; background:rgba(7,17,38,.19); filter:blur(28px); }
    .phone { position:absolute; right:84px; top:12px; width:386px; height:696px; padding:15px 13px 18px; border-radius:58px; background:linear-gradient(145deg,#30343b,#080a0e 42%,#252a31); box-shadow:0 34px 70px rgba(7,17,38,.27),inset 0 0 0 2px rgba(255,255,255,.18),inset 0 0 0 5px #050608; }
    .screen { position:relative; width:360px; height:640px; overflow:hidden; border-radius:43px; background:#fff; }
    iframe { display:block; width:450px; height:800px; border:0; transform:scale(.8); transform-origin:0 0; }
    .island { position:absolute; z-index:5; left:50%; top:23px; width:116px; height:31px; transform:translateX(-50%); border-radius:20px; background:#050608; box-shadow:inset 0 0 0 1px rgba(255,255,255,.06); pointer-events:none; }
    .island:after { content:""; position:absolute; right:10px; top:11px; width:8px; height:8px; border-radius:50%; background:#19233b; box-shadow:inset 0 0 0 2px #0a0d13; }
    .speaker { position:absolute; z-index:5; left:50%; bottom:8px; width:112px; height:5px; transform:translateX(-50%); border-radius:5px; background:#080a0e; pointer-events:none; }
    .end { position:absolute; inset:0; z-index:20; display:grid; place-items:center; background:#f7f8fa; opacity:0; pointer-events:none; transition:opacity 360ms ease; }
    .end.show { opacity:1; }
    .end-inner { text-align:center; }
    .end img { display:block; width:430px; height:auto; margin:auto; }
    .end strong { display:block; margin-top:25px; font-size:25px; letter-spacing:-.025em; }
    .end p { margin:8px 0 0; color:#617187; font-size:16px; }
  </style>
</head>
<body>
  <main class="scene">
    <div class="grid"></div>
    <img class="brand" src="${baseUrl}/images/avantia/avantia-build-lockup-navy.webp" alt="">
    <section class="copy">
      <div class="eyebrow">${isCustomRequest ? "Request any item" : "Order materials fast"}</div>
      <h1>From jobsite need to request—in seconds.</h1>
      <p class="sub">${isCustomRequest ? "Your personal material shopper. Describe what you need once—we source it for you." : "Choose your materials, add delivery details, and review the complete order right from your phone."}</p>
      <div class="steps">
        <div class="step active" data-step="1"><span>1</span>${isCustomRequest ? "Describe any custom item" : "Choose the material and quantity"}</div>
        <div class="step" data-step="2"><span>2</span>${isCustomRequest ? "Add quantities and specifications" : "Add jobsite delivery details"}</div>
        <div class="step" data-step="3"><span>3</span>${isCustomRequest ? "Send one request for pricing" : "Review the complete request"}</div>
      </div>
    </section>
    <div class="phone-shadow"></div>
    <div class="phone" aria-label="iPhone showing the Avantia Build order form">
      <div class="screen"><iframe title="Avantia Build mobile order" src="${baseUrl}${isCustomRequest ? "/request-quote" : "/shop/framing"}"></iframe></div>
      <div class="island"></div>
      <div class="speaker"></div>
    </div>
    <section class="end"><div class="end-inner"><img src="${baseUrl}/images/avantia/avantia-build-lockup-navy.webp" alt=""><strong>You build. We handle the materials.</strong><p>Plans, pricing, ordering, and jobsite delivery.</p></div></section>
  </main>
</body>
</html>`, { waitUntil: "load" });

const phone = page.frameLocator('iframe[title="Avantia Build mobile order"]');
await phone.getByRole("heading", { name: isCustomRequest ? "Get Pricing for Your Materials" : "Framing Lumber Quick Order" }).waitFor();

const frame = page.frames().find((candidate) => candidate.url().includes(isCustomRequest ? "/request-quote" : "/shop/framing"));
if (!frame) throw new Error("Could not find the phone order frame");

await frame.evaluate(() => {
  const touch = document.createElement("div");
  touch.dataset.demoTouch = "true";
  touch.style.cssText = "position:fixed;left:0;top:0;z-index:2147483647;width:34px;height:34px;border:3px solid #0071e3;border-radius:50%;background:rgba(0,113,227,.14);pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(.72);transition:opacity 100ms ease,transform 150ms ease;box-shadow:0 2px 10px rgba(0,0,0,.2)";
  document.documentElement.append(touch);
  document.addEventListener("mousemove", (event) => {
    touch.style.left = `${event.clientX}px`;
    touch.style.top = `${event.clientY}px`;
    touch.style.opacity = "1";
  }, { passive: true });
  document.addEventListener("mousedown", () => { touch.style.transform = "translate(-50%,-50%) scale(1.18)"; });
  document.addEventListener("mouseup", () => { touch.style.transform = "translate(-50%,-50%) scale(.72)"; });
});

let primaryField;
if (isCustomRequest) {
  await phone.getByLabel("Full name").fill("Jordan Builder");
  await phone.getByLabel("Email").fill("jordan@example.com");
  await phone.getByLabel("Phone").fill("516-555-0142");
  primaryField = phone.locator('textarea[name="details"]');
  await primaryField.fill("");
  await primaryField.scrollIntoViewIfNeeded();
} else {
  const size = phone.getByLabel("Lumber size");
  await size.selectOption({ label: "2x4" });
  const length = phone.getByLabel("Length");
  await length.selectOption({ label: "10 ft." });
  primaryField = phone.getByLabel("Quantity");
  await primaryField.fill("");
  await primaryField.scrollIntoViewIfNeeded();
}
await page.screenshot({ path: outputPoster, type: "png" });

const trimStartSeconds = Math.max(0, (Date.now() - recordingStartedAt) / 1000 - 0.08);
await page.waitForTimeout(3000);

let pointerX = 1030;
let pointerY = 160;

async function moveTo(locator, duration = 520) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Could not locate ${locator}`);
  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;
  const distance = Math.hypot(targetX - pointerX, targetY - pointerY);
  const steps = Math.max(14, Math.round(distance / 22));
  for (let step = 1; step <= steps; step += 1) {
    const amount = step / steps;
    const eased = amount < .5 ? 2 * amount * amount : 1 - Math.pow(-2 * amount + 2, 2) / 2;
    await page.mouse.move(pointerX + (targetX - pointerX) * eased, pointerY + (targetY - pointerY) * eased);
    await page.waitForTimeout(duration / steps);
  }
  pointerX = targetX;
  pointerY = targetY;
}

async function tap(locator, settle = 360) {
  await moveTo(locator);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(settle);
}

if (isCustomRequest) {
  await moveTo(primaryField, 600);
  await primaryField.focus();
  await primaryField.pressSequentially("24 custom black steel brackets, 8 in. x 8 in., exterior grade. Deliver Friday.", { delay: 43 });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.querySelectorAll(".step").forEach((step) => step.classList.toggle("active", step.dataset.step === "2"));
  });
  await page.waitForTimeout(950);
  await page.evaluate(() => {
    document.querySelectorAll(".step").forEach((step) => step.classList.toggle("active", step.dataset.step === "3"));
  });
  const send = phone.getByRole("button", { name: "Send for Pricing", exact: true });
  await send.scrollIntoViewIfNeeded();
  await moveTo(send, 650);
  await page.waitForTimeout(250);
  await frame.evaluate(() => {
    const overlay = document.createElement("section");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;background:rgba(7,17,38,.75);backdrop-filter:blur(3px)";
    overlay.innerHTML = `<div style="width:100%;max-width:390px;border-radius:18px;background:#fff;padding:24px;box-shadow:0 28px 80px rgba(0,0,0,.38);font-family:'Avenir Next','Segoe UI',sans-serif"><div style="display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#eaf7ee;color:#147a3d;font-size:26px;font-weight:800">✓</div><h2 style="margin:18px 0 5px;color:#071126;font-size:24px">Request ready for pricing</h2><p style="margin:0;color:#617187;font-size:14px;line-height:1.5">One custom request. Avantia sources the item, compares options, and coordinates delivery.</p><div style="margin-top:18px;border-radius:12px;background:#f5f7fa;padding:14px;color:#071126;font-size:13px;font-weight:700;line-height:1.5">24 custom black steel brackets<br>8 in. × 8 in. · Exterior grade · Friday delivery</div></div>`;
    document.body.append(overlay);
  });
  await page.waitForTimeout(3900);
} else {
  await moveTo(primaryField, 600);
  await primaryField.focus();
  await primaryField.pressSequentially("120", { delay: 165 });
  await page.waitForTimeout(380);
  await tap(phone.getByLabel("Douglas Fir"), 500);

  await page.evaluate(() => {
    document.querySelectorAll(".step").forEach((step) => step.classList.toggle("active", step.dataset.step === "2"));
  });

  const notes = phone.getByLabel("Any plywood, hardware, grade, or delivery notes?");
  await tap(notes, 220);
  await notes.pressSequentially("Add 40 sheets 7/16 OSB. Deliver to rear driveway.", { delay: 48 });
  await page.waitForTimeout(550);

  await page.evaluate(() => {
    document.querySelectorAll(".step").forEach((step) => step.classList.toggle("active", step.dataset.step === "3"));
  });

  await tap(phone.getByRole("button", { name: "Review", exact: true }), 280);
  const reviewHeading = phone.getByRole("heading", { name: "Review Your Request" });
  await reviewHeading.waitFor();
  await reviewHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(3900);
}

await page.evaluate(() => document.querySelector(".end")?.classList.add("show"));
await page.waitForTimeout(isCustomRequest ? 6500 : 4500);

const video = page.video();
await context.close();
await video.saveAs(rawVideo);
await browser.close();

await promisify(execFile)("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error", "-ss", trimStartSeconds.toFixed(3), "-i", rawVideo,
  "-t", "19.8", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outputMp4,
]);

await promisify(execFile)("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error", "-ss", trimStartSeconds.toFixed(3), "-i", rawVideo,
  "-t", "19.8", "-an", "-c:v", "libvpx", "-crf", "24", "-b:v", "1M", outputWebm,
]);

const captions = isCustomRequest ? `WEBVTT

00:00:00.000 --> 00:00:03.000
Request any item in seconds. Your personal material shopper.

00:00:03.000 --> 00:00:09.000
Describe the custom item, quantity, and specifications.

00:00:09.000 --> 00:00:13.500
Send one request for organized supplier pricing.

00:00:13.500 --> 00:00:19.800
Avantia Build sources, compares, and coordinates delivery.
` : `WEBVTT

00:00:00.000 --> 00:00:03.000
Order jobsite materials fast, right from your phone.

00:00:03.000 --> 00:00:08.000
Choose the material and quantity.

00:00:08.000 --> 00:00:12.000
Add jobsite delivery details.

00:00:12.000 --> 00:00:15.300
Review the complete request.

00:00:15.300 --> 00:00:19.800
Avantia Build. You build. We handle the materials.
`;
await writeFile(outputCaptions, captions, "utf8");

console.log(`Created ${outputMp4}`);
console.log(`Created ${outputWebm}`);
console.log(`Created ${outputPoster}`);
console.log(`Created ${outputCaptions}`);
