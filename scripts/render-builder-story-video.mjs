import { chromium } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3100";
const outputDir = join(process.cwd(), "public", "videos");
const outputMp4 = join(outputDir, "avantia-builder-story.mp4");
const outputWebm = join(outputDir, "avantia-builder-story.webm");
const outputPoster = join(outputDir, "avantia-builder-story-poster.png");
const recordingDir = await mkdtemp(join(tmpdir(), "avantia-builder-story-"));
const rawVideo = join(recordingDir, "avantia-builder-story-raw.webm");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: recordingDir, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
const recordingStartedAt = Date.now();

await page.setContent(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#071126}body{font-family:"Avenir Next","Segoe UI",Arial,sans-serif}.scene{position:relative;width:1280px;height:720px;overflow:hidden;background:#071126}.photo{position:absolute;inset:-28px;background-position:center;background-size:cover;opacity:0;transform:scale(1.035);transition:opacity 650ms ease,transform 4s ease}.photo.show{opacity:1;transform:scale(1)}.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,17,38,.91) 0%,rgba(7,17,38,.7) 42%,rgba(7,17,38,.17) 75%,rgba(7,17,38,.05) 100%)}.brand{position:absolute;z-index:3;left:58px;top:44px;width:205px;filter:brightness(0) invert(1)}.copy{position:absolute;z-index:3;left:62px;right:60px;bottom:72px}.kicker{color:#68b9ff;font-size:15px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.line{margin:14px 0 0;max-width:780px;color:#fff;font-size:62px;font-weight:800;line-height:1.02;letter-spacing:-.045em;text-shadow:0 3px 24px rgba(0,0,0,.3);opacity:0;transform:translateY(18px);transition:opacity 280ms ease,transform 330ms ease}.line.show{opacity:1;transform:translateY(0)}.progress{position:absolute;z-index:4;left:62px;right:62px;bottom:38px;height:4px;border-radius:4px;background:rgba(255,255,255,.22);overflow:hidden}.progress:after{content:"";display:block;width:0;height:100%;background:#f2931d;animation:progress 20s linear forwards}@keyframes progress{to{width:100%}}.final{position:absolute;z-index:8;inset:0;display:grid;place-items:center;background:#f7f8fa;opacity:0;transition:opacity 500ms ease}.final.show{opacity:1}.final div{text-align:center}.final img{display:block;width:430px;height:auto;margin:auto}.final strong{display:block;margin-top:25px;color:#071126;font-size:29px;letter-spacing:-.03em}.final p{margin:9px 0 0;color:#617187;font-size:17px}
</style></head><body><main class="scene">
<div hidden><img src="${baseUrl}/videos/story/crew-waiting.png" alt=""><img src="${baseUrl}/videos/story/supplier-calls.png" alt=""><img src="${baseUrl}/videos/story/crew-working.png" alt=""></div>
<div class="photo show" data-photo="waiting" style="background-image:url('${baseUrl}/videos/story/crew-waiting.png')"></div>
<div class="photo" data-photo="calls" style="background-image:url('${baseUrl}/videos/story/supplier-calls.png')"></div>
<div class="photo" data-photo="working" style="background-image:url('${baseUrl}/videos/story/crew-working.png')"></div>
<div class="shade"></div><img class="brand" src="${baseUrl}/images/avantia/avantia-build-lockup-navy.webp" alt="">
<section class="copy"><div class="kicker">Why work with Avantia?</div><div class="line show">You’re a builder.</div></section><div class="progress"></div>
<section class="final"><div><img src="${baseUrl}/images/avantia/avantia-build-lockup-navy.webp" alt=""><strong>You build. We handle the materials.</strong><p>One request. We source, compare, and coordinate.</p></div></section>
</main></body></html>`, { waitUntil: "load" });

await page.waitForFunction(() => [...document.images].every((image) => image.complete));
await page.screenshot({ path: outputPoster, type: "png" });
const trimStartSeconds = Math.max(0, (Date.now() - recordingStartedAt) / 1000 - 0.08);

const beats = [
  { at: 1800, line: "Your crew should be building.", photo: "waiting" },
  { at: 3800, line: "Not calling 10 suppliers.", photo: "calls" },
  { at: 5800, line: "Not waiting for callbacks.", photo: "calls" },
  { at: 7800, line: "Not chasing what’s in stock.", photo: "calls" },
  { at: 9800, line: "Missing materials stop the job.", photo: "waiting" },
  { at: 11800, line: "Idle crews cost money.", photo: "waiting" },
  { at: 13800, line: "Send us one request.", photo: "working" },
  { at: 15800, line: "We source. Compare. Coordinate.", photo: "working" },
];

let previous = 0;
for (const beat of beats) {
  await page.waitForTimeout(beat.at - previous);
  await page.evaluate(({ line, photo }) => {
    const copy = document.querySelector(".line");
    copy?.classList.remove("show");
    document.querySelectorAll(".photo").forEach((element) => element.classList.toggle("show", element.dataset.photo === photo));
    setTimeout(() => { if (copy) { copy.textContent = line; copy.classList.add("show"); } }, 170);
  }, beat);
  previous = beat.at;
}

await page.waitForTimeout(1900);
await page.evaluate(() => document.querySelector(".final")?.classList.add("show"));
await page.waitForTimeout(2500);

const video = page.video();
await context.close();
await video.saveAs(rawVideo);
await browser.close();

await promisify(execFile)("ffmpeg", ["-y","-hide_banner","-loglevel","error","-ss",trimStartSeconds.toFixed(3),"-i",rawVideo,"-t","20","-an","-c:v","libx264","-preset","medium","-crf","21","-pix_fmt","yuv420p","-movflags","+faststart",outputMp4]);
await promisify(execFile)("ffmpeg", ["-y","-hide_banner","-loglevel","error","-ss",trimStartSeconds.toFixed(3),"-i",rawVideo,"-t","20","-an","-c:v","libvpx","-crf","24","-b:v","1M",outputWebm]);

console.log(`Created ${outputMp4}`);
console.log(`Created ${outputWebm}`);
console.log(`Created ${outputPoster}`);
