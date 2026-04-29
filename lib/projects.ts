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
