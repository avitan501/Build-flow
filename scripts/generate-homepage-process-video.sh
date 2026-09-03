#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT="${REPO_ROOT}/public/videos/homepage-material-process.mp4"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
ASSETS="${REPO_ROOT}/public/images/buildflow-homepage"

command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg is required" >&2; exit 1; }
test -f "${FONT}" || { echo "Font not found: ${FONT}" >&2; exit 1; }

# Story prompt: a real Long Island contractor texts a material list; Avantia
# receives and reviews it; matching materials appear as a moving editorial
# collage; then a real boom-truck delivery reaches the house. Documentary
# photography only, restrained navy/charcoal grade, no fake app mockup, no
# logo end card, and nobody posing or making a phone call.
ffmpeg -y -loglevel error \
  -loop 1 -t 3 -i "${ASSETS}/service-send-list-v4.webp" \
  -loop 1 -t 3 -i "${ASSETS}/service-beat-quote-v4.webp" \
  -loop 1 -t 3 -i "${ASSETS}/hero-material-yard-v4.webp" \
  -loop 1 -t 3 -i "${ASSETS}/process-delivery-v4.webp" \
  -loop 1 -t 3 -i "${ASSETS}/service-send-list-v4.webp" \
  -loop 1 -t 3 -i "${ASSETS}/service-beat-quote-v4.webp" \
  -loop 1 -t 3 -i "${ASSETS}/hero-material-yard-v4.webp" \
  -loop 1 -t 3 -i "${ASSETS}/hero-exterior-materials-v4.webp" \
  -filter_complex "
    [0:v]scale=720:900:force_original_aspect_ratio=increase,crop=720:900,zoompan=z='min(zoom+0.0003,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x900:fps=30,trim=duration=3,setpts=PTS-STARTPTS,setsar=1,settb=AVTB,drawbox=x=28:y=700:w=664:h=150:color=0x071126@0.78:t=fill,drawtext=fontfile=${FONT}:text='01  TEXT THE LIST':fontcolor=0xE7B85D:fontsize=22:x=52:y=726,drawtext=fontfile=${FONT}:text='Start with what you have.':fontcolor=white:fontsize=32:x=52:y=770[v0];
    [1:v]scale=720:900:force_original_aspect_ratio=increase,crop=720:900,zoompan=z='min(zoom+0.00024,1.03)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x900:fps=30,trim=duration=3,setpts=PTS-STARTPTS,setsar=1,settb=AVTB,drawbox=x=28:y=700:w=664:h=150:color=0x071126@0.78:t=fill,drawtext=fontfile=${FONT}:text='02  WE REVIEW':fontcolor=0xE7B85D:fontsize=22:x=52:y=726,drawtext=fontfile=${FONT}:text='Material. Price. Delivery.':fontcolor=white:fontsize=31:x=52:y=770[v1];
    [2:v]scale=720:900:force_original_aspect_ratio=increase,crop=720:900,zoompan=z='min(zoom+0.00028,1.032)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x900:fps=30,trim=duration=3,setpts=PTS-STARTPTS,setsar=1,settb=AVTB,drawbox=x=28:y=700:w=664:h=150:color=0x071126@0.78:t=fill,drawtext=fontfile=${FONT}:text='03  COMPARE':fontcolor=0xE7B85D:fontsize=22:x=52:y=726,drawtext=fontfile=${FONT}:text='Matching sources and prices.':fontcolor=white:fontsize=29:x=52:y=770[v2];
    [3:v]scale=720:900:force_original_aspect_ratio=increase,crop=720:900,zoompan=z='min(zoom+0.00025,1.03)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x900:fps=30,trim=duration=3,setpts=PTS-STARTPTS,setsar=1,settb=AVTB,drawbox=x=28:y=700:w=664:h=150:color=0x071126@0.78:t=fill,drawtext=fontfile=${FONT}:text='04  DELIVER':fontcolor=0xE7B85D:fontsize=22:x=52:y=726,drawtext=fontfile=${FONT}:text='Materials reach the jobsite.':fontcolor=white:fontsize=30:x=52:y=770[v3];
    [4:v]scale=360:450:force_original_aspect_ratio=increase,crop=360:450,setsar=1[c0];
    [5:v]scale=360:450:force_original_aspect_ratio=increase,crop=360:450,setsar=1[c1];
    [6:v]scale=360:450:force_original_aspect_ratio=increase,crop=360:450,setsar=1[c2];
    [7:v]scale=360:450:force_original_aspect_ratio=increase,crop=360:450,setsar=1[c3];
    [c0][c1]hstack=inputs=2[top];
    [c2][c3]hstack=inputs=2[bottom];
    [top][bottom]vstack=inputs=2,fps=30,tpad=stop_mode=clone:stop_duration=3,trim=duration=3,setpts=PTS-STARTPTS,settb=AVTB,format=yuv420p,drawbox=x=0:y=0:w=720:h=900:color=0x071126@0.16:t=fill,drawbox=x=38:y=375:w=644:h=150:color=0x030507@0.82:t=fill,drawtext=fontfile=${FONT}:text='ONE REQUEST. MORE REACH.':fontcolor=0xE7B85D:fontsize=27:x=(w-text_w)/2:y=405,drawtext=fontfile=${FONT}:text='From the list to the jobsite.':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=458,setsar=1[v4];
    [v0]null[f0];
    [v1]null[f1];
    [v2]null[f2];
    [v3]null[f3];
    [v4]null[f4];
    [f0][f1][f2][f3][f4]concat=n=5:v=1:a=0,format=yuv420p[outv]
  " \
  -map "[outv]" -t 15 -an -c:v libx264 -preset slow -crf 22 \
  -movflags +faststart -pix_fmt yuv420p "${OUTPUT}"

echo "Created ${OUTPUT}"
