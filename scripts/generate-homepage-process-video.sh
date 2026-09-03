#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT="${REPO_ROOT}/public/videos/homepage-material-process.mp4"
ASSETS="${REPO_ROOT}/public/images/buildflow-homepage"
VIDEOS="${REPO_ROOT}/public/videos"

command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg is required" >&2; exit 1; }

# Homepage process film, 11.8 seconds, silent and loop-safe.
#
# Storyboard / generation prompt:
# 01 REQUEST (0.0-2.2s) — a real Long Island contractor texts a photographed
#    material list from an active residential framing job.
# 02 REVIEW (2.2-4.8s) — moving footage of the request being reviewed.
# 03 SOURCE (4.8-7.4s) — moving footage of materials being coordinated.
# 04 JOBSITE (7.4-9.8s) — materials and crew moving at the house.
# 05 ONE REQUEST (9.8-11.8s) — four simultaneous moving views: request,
#    sourcing, delivery, and construction.
#
# Direction: documentary Long Island construction photography, natural motion,
# restrained navy/charcoal grade, no fake phone call, no logo end card, no
# talking head, no stock-office scene, no static slideshow after the opening
# request beat. The surrounding page owns all copy and controls.
ffmpeg -y -loglevel error \
  -loop 1 -t 2.2 -i "${ASSETS}/process-text-request-v5.webp" \
  -i "${VIDEOS}/avantia-hero-background-v12-mobile.mp4" \
  -i "${VIDEOS}/avantia-builder-story.mp4" \
  -filter_complex "
    [0:v]scale=720:900:force_original_aspect_ratio=increase,crop=720:900,
      zoompan=z='min(zoom+0.00045,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x900:fps=30,
      trim=duration=2.2,setpts=PTS-STARTPTS,setsar=1,settb=AVTB,format=yuv420p[request];

    [1:v]split=6[review_raw][source_raw][jobsite_raw][grid_request_raw][grid_source_raw][grid_jobsite_raw];
    [review_raw]trim=start=3.0:end=5.6,setpts=PTS-STARTPTS,
      crop=720:900:0:95,fps=30,setsar=1,settb=AVTB,format=yuv420p[review];
    [source_raw]trim=start=7.0:end=9.6,setpts=PTS-STARTPTS,
      crop=720:900:0:95,fps=30,setsar=1,settb=AVTB,format=yuv420p[source];
    [jobsite_raw]trim=start=9.7:end=12.1,setpts=PTS-STARTPTS,
      crop=720:900:0:95,fps=30,setsar=1,settb=AVTB,format=yuv420p[jobsite];

    [grid_request_raw]trim=start=3.4:end=5.4,setpts=PTS-STARTPTS,
      crop=720:900:0:95,scale=360:450,fps=30,setsar=1,settb=AVTB[grid_request];
    [grid_source_raw]trim=start=7.2:end=9.2,setpts=PTS-STARTPTS,
      crop=720:900:0:95,scale=360:450,fps=30,setsar=1,settb=AVTB[grid_source];
    [grid_jobsite_raw]trim=start=10.0:end=12.0,setpts=PTS-STARTPTS,
      crop=720:900:0:95,scale=360:450,fps=30,setsar=1,settb=AVTB[grid_jobsite];
    [2:v]trim=start=14.2:end=16.2,setpts=PTS-STARTPTS,
      crop=720:520:280:0,scale=360:450,
      fps=30,setsar=1,settb=AVTB[grid_build];
    [grid_request][grid_source]hstack=inputs=2[grid_top];
    [grid_jobsite][grid_build]hstack=inputs=2[grid_bottom];
    [grid_top][grid_bottom]vstack=inputs=2,
      drawbox=x=0:y=0:w=720:h=900:color=0x071126@0.12:t=fill,
      format=yuv420p[grid];

    [request][review][source][jobsite][grid]concat=n=5:v=1:a=0,
      eq=saturation=0.88:contrast=1.03:brightness=-0.015,
      format=yuv420p[outv]
  " \
  -map "[outv]" -an -c:v libx264 -preset slow -crf 21 \
  -movflags +faststart -pix_fmt yuv420p "${OUTPUT}"

echo "Created ${OUTPUT}"
