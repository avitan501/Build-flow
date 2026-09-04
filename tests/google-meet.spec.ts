import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createInstantGoogleMeet,
  GOOGLE_MEET_ATTENDEE,
  GOOGLE_MEET_ORGANIZER,
} from "@/lib/google-meet";

const root = process.cwd();
const credentials = {
  clientId: "test-client",
  clientSecret: "test-secret",
  refreshToken: "test-refresh",
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("creates an immediate Meet as David and invites only the internal manager account", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes("oauth2.googleapis.com/token")) {
      return json({ access_token: "access-token" });
    }
    if (url.includes("/calendars/primary?fields=id")) {
      return json({ id: GOOGLE_MEET_ORGANIZER });
    }
    return json({
      id: "event-1",
      organizer: { email: GOOGLE_MEET_ORGANIZER },
      hangoutLink: "https://meet.google.com/abc-defg-hij",
    });
  };

  const result = await createInstantGoogleMeet({
    credentials,
    fetchImpl,
    now: new Date("2026-09-04T14:00:00.000Z"),
    requestId: "unique-request-id",
  });

  expect(result).toEqual({
    eventId: "event-1",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    organizer: GOOGLE_MEET_ORGANIZER,
    attendee: GOOGLE_MEET_ATTENDEE,
  });
  expect(requests).toHaveLength(3);
  expect(requests[2].url).toContain("conferenceDataVersion=1&sendUpdates=all");
  const event = JSON.parse(String(requests[2].init?.body));
  expect(event.attendees).toEqual([{ email: GOOGLE_MEET_ATTENDEE }]);
  expect(event.start).toEqual({
    dateTime: "2026-09-04T14:00:00.000Z",
    timeZone: "America/New_York",
  });
  expect(event.end.dateTime).toBe("2026-09-04T14:30:00.000Z");
  expect(event.conferenceData.createRequest).toEqual({
    requestId: "unique-request-id",
    conferenceSolutionKey: { type: "hangoutsMeet" },
  });
});

test("refuses to create a meeting when Google is connected as another organizer", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    if (String(input).includes("oauth2.googleapis.com/token")) {
      return json({ access_token: "access-token" });
    }
    return json({ id: "someone-else@gmail.com" });
  };

  await expect(
    createInstantGoogleMeet({ credentials, fetchImpl }),
  ).rejects.toMatchObject({
    code: "organizer_mismatch",
  });
});

test("waits for Google when conference creation is initially pending", async () => {
  let eventReads = 0;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com/token")) {
      return json({ access_token: "access-token" });
    }
    if (url.includes("/calendars/primary?fields=id")) {
      return json({ id: GOOGLE_MEET_ORGANIZER });
    }
    if (url.includes("/events/event-pending")) {
      eventReads += 1;
      return json({
        id: "event-pending",
        organizer: { email: GOOGLE_MEET_ORGANIZER },
        conferenceData: {
          entryPoints:
            eventReads === 2
              ? [{ entryPointType: "video", uri: "https://meet.google.com/pending-now-ready" }]
              : [],
        },
      });
    }
    return json({
      id: "event-pending",
      organizer: { email: GOOGLE_MEET_ORGANIZER },
      conferenceData: { entryPoints: [] },
    });
  };
  const waits: number[] = [];

  const result = await createInstantGoogleMeet({
    credentials,
    fetchImpl,
    wait: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });

  expect(result.meetingUrl).toBe("https://meet.google.com/pending-now-ready");
  expect(eventReads).toBe(2);
  expect(waits).toEqual([250, 250]);
});

test("manager Meet button uses a protected same-origin POST instead of a calendar draft", async () => {
  const [route, launcher, tools, dashboard] = await Promise.all([
    readFile(path.join(root, "app/api/admin/google-meet/route.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/google-meet-launcher.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
  ]);
  expect(route).toContain("getSessionWithProfile");
  expect(route).toContain("managerCapabilities");
  expect(route).toContain('origin !== new URL(request.url).origin');
  expect(route).toContain("createInstantGoogleMeet");
  expect(launcher).toContain('fetch("/api/admin/google-meet"');
  expect(launcher).toContain('method: "POST"');
  expect(launcher).toContain('url.hostname !== "meet.google.com"');
  expect(tools).toContain("<GoogleMeetLauncher />");
  expect(dashboard).toContain('<GoogleMeetLauncher variant="row" />');
  expect(tools).not.toContain("calendar.google.com/calendar/render");
  expect(dashboard).not.toContain("CARLOS_MEETING_URL");
});
