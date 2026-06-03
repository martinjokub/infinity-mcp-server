export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface InfinityPage<T> {
  has_more: boolean;
  before?: string | null;
  after?: string | null;
  data: T[];
}

export interface InfinityWorkspace {
  id: string | number;
  object: "workspace";
  name: string;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface InfinityMember {
  id: number;
  object: "user";
  name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  role?: string;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface MemberBody {
  role: string;
}

export interface InviteMemberBody extends MemberBody {
  email: string;
}

export interface InfinityBoard {
  id: string;
  object: "board";
  name: string;
  description?: string | null;
  color?: string | null;
  user_ids?: number[];
  workspace_id?: string | number;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface BoardBody {
  name: string;
  description?: string | null;
  color?: string;
  user_ids?: number[];
}

export interface InfinityFolder {
  id: string;
  object: "folder";
  name: string;
  sort_order?: string;
  color?: string | null;
  settings?: JsonObject;
  attribute_ids?: string[];
  parent_id?: string | null;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface InfinityAttribute {
  id: string;
  object: "attribute";
  name: string;
  type: string;
  default_data?: JsonValue;
  settings?: JsonObject;
  [key: string]: unknown;
}

export interface AttributeBody {
  name?: string;
  type?: string;
  default_data?: JsonValue;
  settings?: JsonObject;
}

export interface InfinityValue {
  attribute_id: string;
  data: JsonValue;
}

export interface InfinityItem {
  id: string;
  object: "item";
  folder_id: string;
  parent_id?: string | null;
  values?: InfinityValue[] | Record<string, JsonValue>;
  created_at?: string;
  sort_order?: string;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface FolderBody {
  name?: string;
  color?: string | null;
  parent_id?: string | null;
  attribute_ids?: string[];
  sort_order?: string;
  settings?: JsonObject;
}

export interface ItemBody {
  folder_id?: string;
  parent_id?: string | null;
  values?: InfinityValue[];
  sort_order?: string;
}

export interface PaginationInput {
  limit?: number;
  after?: string;
  before?: string;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
  expand?: string[];
}

export type ResponseFormat = "markdown" | "json";
