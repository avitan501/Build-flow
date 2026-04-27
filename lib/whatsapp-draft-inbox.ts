export type ContactType = "client" | "supplier" | "worker" | "unknown";
export type PermissionMode = "draft_only" | "auto_ack_only" | "block_bot" | "ask_follow_up";

export type InboxThread = {
  id: string;
  contactName: string;
  phone: string;
  contactType: ContactType;
  linkedProject: string | null;
  linkedClient: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  hasMedia: boolean;
  status: "awaiting_draft" | "awaiting_review" | "blocked";
  permissionMode: PermissionMode;
  permissionFlags: {
    saveFiles: boolean;
    createLead: boolean;
    createProjectDraft: boolean;
  };
};

export const whatsappInboxMock: InboxThread[] = [
  {
    id: "thread-client-001",
    contactName: "David Levy",
    phone: "+1 ••• ••• 8484",
    contactType: "client",
    linkedProject: "Kitchen remodel - Great Neck",
    linkedClient: "David Levy",
    lastMessage: "Can you send the updated material list and tell me when delivery is possible?",
    lastMessageAt: "Today · 01:37",
    unreadCount: 2,
    hasMedia: true,
    status: "awaiting_draft",
    permissionMode: "draft_only",
    permissionFlags: {
      saveFiles: true,
      createLead: false,
      createProjectDraft: false,
    },
  },
  {
    id: "thread-supplier-002",
    contactName: "ABC Marble",
    phone: "+1 ••• ••• 1142",
    contactType: "supplier",
    linkedProject: "Bath vanity package",
    linkedClient: null,
    lastMessage: "Attached revised slab availability for next week.",
    lastMessageAt: "Today · 00:58",
    unreadCount: 1,
    hasMedia: true,
    status: "awaiting_review",
    permissionMode: "draft_only",
    permissionFlags: {
      saveFiles: true,
      createLead: false,
      createProjectDraft: false,
    },
  },
  {
    id: "thread-unknown-003",
    contactName: "Unknown contact",
    phone: "+1 ••• ••• 2205",
    contactType: "unknown",
    linkedProject: null,
    linkedClient: null,
    lastMessage: "Need pricing for framing package.",
    lastMessageAt: "Yesterday · 21:12",
    unreadCount: 1,
    hasMedia: false,
    status: "blocked",
    permissionMode: "ask_follow_up",
    permissionFlags: {
      saveFiles: false,
      createLead: true,
      createProjectDraft: true,
    },
  },
];

export const whatsappPermissionOptions = [
  { value: "draft_only", label: "Draft only" },
  { value: "auto_ack_only", label: "Auto acknowledge only" },
  { value: "block_bot", label: "Block bot" },
  { value: "ask_follow_up", label: "Ask follow-up questions" },
] as const;

export const whatsappSafetyRules = [
  "No final price without Admin approval",
  "No delivery promise",
  "No payment confirmation",
  "No order confirmation",
  "No discount",
  "No supplier commitment",
];

export function getInboxThread(threadId: string) {
  return whatsappInboxMock.find((thread) => thread.id === threadId) ?? whatsappInboxMock[0];
}
