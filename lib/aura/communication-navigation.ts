type CommunicationInboxNavigation = {
  channel: string
  communicationId: string
  thread: string
  query: string
  draft: string
}

export function communicationInboxNavigationKey({
  channel,
  communicationId,
  thread,
  query,
  draft,
}: CommunicationInboxNavigation) {
  return JSON.stringify([
    channel,
    communicationId,
    thread,
    query.slice(0, 160),
    draft.slice(0, 1600),
  ])
}
