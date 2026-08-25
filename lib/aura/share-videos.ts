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

export const AVANTIA_WHATSAPP_LINK = "https://wa.me/13479378665";

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || "there";
}

export function buildAuraShareVideoCaption(video: (typeof auraShareVideos)[number], recipientName?: string) {
  return `Hi ${firstName(recipientName)}, welcome to Avantia Build.\n\nHere is a short video: ${video.title}.\n\nSend us your material list, plans, photos, or supplier quote directly on WhatsApp:\n${AVANTIA_WHATSAPP_LINK}\n\nAvantia Build\n(347) 937-8665\n\nReply STOP if you no longer want to receive messages.`;
}

export function findAuraShareVideo(id: string) {
  return auraShareVideos.find((video) => video.id === id) || null;
}
