export const auraShareVideos = [
  {
    id: "request-materials",
    title: "How to Request Materials",
    durationLabel: "20 sec",
    path: "/videos/avantia-request-material-whatsapp-en-clear-20s.mp4",
  },
  {
    id: "why-hire-avantia",
    title: "Why Contractors Hire Avantia",
    durationLabel: "20 sec",
    path: "/videos/avantia-why-contractors-hire-us-en-slow.mp4",
  },
] as const;

export type AuraShareVideoId = (typeof auraShareVideos)[number]["id"];

export function findAuraShareVideo(id: string) {
  return auraShareVideos.find((video) => video.id === id) || null;
}
