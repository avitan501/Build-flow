type WebsiteDefectsAccess = {
  owner: boolean
  operationsManager: boolean
}

/** Approved, active operations staff may report and review website issues. */
export function canReportWebsiteDefects(access: WebsiteDefectsAccess) {
  return access.owner || access.operationsManager
}

/** Workflow/status changes and QA sign-off remain owner-controlled. */
export function canManageWebsiteDefects(access: WebsiteDefectsAccess) {
  return access.owner
}
