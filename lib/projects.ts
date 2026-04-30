export type ProjectStatus = "draft" | "active" | "archived";

export type ProjectRecord = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type CreateProjectDraftInput = {
  name: string;
  address: string | null;
};

export const PROJECT_CREATION_STATUS_LABEL = "Live";
export const PROJECT_CREATION_ACTIVATION_MESSAGE = "Project creation is now live. Upload and later workflow steps are still preview or coming soon.";
