export type ProjectStatus = "draft" | "active" | "archived";
export type ProjectUploadStatus = "uploaded" | "processing" | "ready" | "archived";

export type ProjectRecord = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type ProjectUploadRecord = {
  id: string;
  project_id: string;
  owner_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  status: ProjectUploadStatus;
  created_at: string;
};

export type CreateProjectDraftInput = {
  name: string;
  address: string | null;
};

// Planned storage path convention for future real uploads:
// project-uploads/{owner_id}/{project_id}/{upload_id}-{safe_file_name}
export const PROJECT_UPLOAD_STORAGE_PATH_PREFIX = "project-uploads";
export const PROJECT_UPLOAD_STORAGE_PATH_TEMPLATE =
  "project-uploads/{owner_id}/{project_id}/{upload_id}-{safe_file_name}";

export const PROJECT_CREATION_STATUS_LABEL = "Live";
export const PROJECT_CREATION_ACTIVATION_MESSAGE = "Project creation is now live. Upload and later workflow steps are still preview or coming soon.";
