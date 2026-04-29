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

export const PROJECT_CREATION_STATUS_LABEL = "Preview";
export const PROJECT_CREATION_ACTIVATION_MESSAGE = "Project creation will activate after database setup.";

export async function prepareProjectDraft(_input: CreateProjectDraftInput) {
  return {
    ok: false,
    status: "coming_soon" as const,
    message: PROJECT_CREATION_ACTIVATION_MESSAGE,
  };
}
