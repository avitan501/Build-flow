const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_MEET_ORGANIZER = "avitanneto@gmail.com";
export const GOOGLE_MEET_ATTENDEE = "buildavantiap@gmail.com";
export const GOOGLE_MEET_SOURCE_URL = "https://build.avantiap.com/";

export type GoogleCalendarCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type GoogleMeetEvent = {
  id?: string;
  hangoutLink?: string;
  organizer?: { email?: string };
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
};

export class GoogleMeetError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_configured"
      | "authorization_failed"
      | "organizer_mismatch"
      | "event_creation_failed"
      | "conference_unavailable",
  ) {
    super(message);
    this.name = "GoogleMeetError";
  }
}

function requiredCredential(value: string | undefined) {
  return value?.trim() || "";
}

export function googleCalendarCredentialsFromEnv(): GoogleCalendarCredentials {
  const credentials = {
    clientId: requiredCredential(process.env.AVANTIA_GOOGLE_CALENDAR_CLIENT_ID),
    clientSecret: requiredCredential(process.env.AVANTIA_GOOGLE_CALENDAR_CLIENT_SECRET),
    refreshToken: requiredCredential(process.env.AVANTIA_GOOGLE_CALENDAR_REFRESH_TOKEN),
  };
  if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
    throw new GoogleMeetError(
      `Connect ${GOOGLE_MEET_ORGANIZER} to Google Calendar before starting a meeting.`,
      "not_configured",
    );
  }
  return credentials;
}

async function jsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function videoMeetingUrl(event: GoogleMeetEvent) {
  const candidate =
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    )?.uri ||
    "";
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname === "meet.google.com"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export async function createInstantGoogleMeet({
  credentials,
  fetchImpl = fetch,
  now = new Date(),
  requestId = crypto.randomUUID(),
  wait = (milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
}: {
  credentials: GoogleCalendarCredentials;
  fetchImpl?: typeof fetch;
  now?: Date;
  requestId?: string;
  wait?: (milliseconds: number) => Promise<void>;
}) {
  const tokenResponse = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const token = await jsonResponse<{ access_token?: string }>(tokenResponse);
  if (!tokenResponse.ok || !token?.access_token) {
    throw new GoogleMeetError(
      `Reconnect ${GOOGLE_MEET_ORGANIZER}; Google Calendar authorization is unavailable.`,
      "authorization_failed",
    );
  }

  const authorization = { Authorization: `Bearer ${token.access_token}` };
  const calendarResponse = await fetchImpl(
    `${GOOGLE_CALENDAR_API}/calendars/primary?fields=id`,
    { headers: authorization, cache: "no-store" },
  );
  const calendar = await jsonResponse<{ id?: string }>(calendarResponse);
  if (!calendarResponse.ok) {
    throw new GoogleMeetError(
      "Google Calendar could not verify the connected organizer.",
      "authorization_failed",
    );
  }
  if (calendar?.id?.trim().toLowerCase() !== GOOGLE_MEET_ORGANIZER) {
    throw new GoogleMeetError(
      `The connected Google Calendar must belong to ${GOOGLE_MEET_ORGANIZER}.`,
      "organizer_mismatch",
    );
  }

  const start = new Date(now);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const eventResponse = await fetchImpl(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        ...authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: "Avantia Build live meeting",
        description: `Live manager meeting started from ${GOOGLE_MEET_SOURCE_URL}`,
        source: { title: "Avantia Build", url: GOOGLE_MEET_SOURCE_URL },
        start: { dateTime: start.toISOString(), timeZone: "America/New_York" },
        end: { dateTime: end.toISOString(), timeZone: "America/New_York" },
        attendees: [{ email: GOOGLE_MEET_ATTENDEE }],
        guestsCanInviteOthers: false,
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
      cache: "no-store",
    },
  );
  let event = await jsonResponse<GoogleMeetEvent>(eventResponse);
  if (!eventResponse.ok || !event?.id) {
    throw new GoogleMeetError(
      "Google Calendar could not create the meeting.",
      "event_creation_failed",
    );
  }
  const eventId = event.id;
  if (event.organizer?.email?.trim().toLowerCase() !== GOOGLE_MEET_ORGANIZER) {
    throw new GoogleMeetError(
      `Google created the event with the wrong organizer instead of ${GOOGLE_MEET_ORGANIZER}.`,
      "organizer_mismatch",
    );
  }
  let meetingUrl = videoMeetingUrl(event);
  for (let attempt = 0; !meetingUrl && attempt < 3; attempt += 1) {
    await wait(250);
    const conferenceResponse = await fetchImpl(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&fields=id,organizer,hangoutLink,conferenceData`,
      { headers: authorization, cache: "no-store" },
    );
    if (!conferenceResponse.ok) continue;
    const refreshedEvent = await jsonResponse<GoogleMeetEvent>(conferenceResponse);
    if (!refreshedEvent) continue;
    event = refreshedEvent;
    if (
      event.organizer?.email?.trim().toLowerCase() !== GOOGLE_MEET_ORGANIZER
    ) {
      throw new GoogleMeetError(
        `Google created the event with the wrong organizer instead of ${GOOGLE_MEET_ORGANIZER}.`,
        "organizer_mismatch",
      );
    }
    meetingUrl = videoMeetingUrl(event);
  }
  if (!meetingUrl) {
    throw new GoogleMeetError(
      "Google created the calendar event but did not return a Google Meet link.",
      "conference_unavailable",
    );
  }
  return {
    eventId,
    meetingUrl,
    organizer: GOOGLE_MEET_ORGANIZER,
    attendee: GOOGLE_MEET_ATTENDEE,
  };
}
