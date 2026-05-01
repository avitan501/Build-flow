export type ProjectStatus = "draft" | "active" | "archived";
export type ProjectUploadStatus = "uploaded" | "processing" | "ready" | "archived";
export type ProjectMaterialStatus = "draft" | "reviewed" | "approved" | "archived";
export type ProjectQuoteStatus = "draft" | "sent" | "approved" | "rejected" | "archived";

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

export type ProjectMaterialRecord = {
  id: string;
  project_id: string;
  owner_id: string;
  upload_id: string | null;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  status: ProjectMaterialStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectQuoteRecord = {
  id: string;
  project_id: string;
  owner_id: string;
  status: ProjectQuoteStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectQuoteItemRecord = {
  id: string;
  quote_id: string;
  project_id: string;
  owner_id: string;
  material_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number;
  line_total: number;
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
export const PROJECT_UPLOAD_STORAGE_BUCKET = "project-uploads";
export const PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const PROJECT_UPLOAD_ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;

export function sanitizeProjectUploadFileName(fileName: string) {
  const trimmed = fileName.trim();
  const normalized = trimmed.length > 0 ? trimmed : "file";
  const withoutPath = normalized.split(/[/\\]/).pop() || "file";
  const sanitized = withoutPath
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized.length > 0 ? sanitized.toLowerCase() : "file";
}

export function buildProjectUploadStoragePath(params: {
  ownerId: string;
  projectId: string;
  uploadId: string;
  fileName: string;
}) {
  const safeFileName = sanitizeProjectUploadFileName(params.fileName);
  return `${params.ownerId}/${params.projectId}/${params.uploadId}-${safeFileName}`;
}

export const PROJECT_CREATION_STATUS_LABEL = "Live";
export const PROJECT_CREATION_ACTIVATION_MESSAGE = "Project creation is now live. Upload and later workflow steps are still preview or coming soon.";
