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
  object?: "value";
  attribute_id?: string;
  data: JsonValue;
  attribute?: InfinityAttribute;
  deleted?: boolean;
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

export interface InfinityComment {
  id: string;
  object: "comment";
  parent_id?: string | null;
  text: string;
  created_at?: string;
  created_by?: number | Record<string, unknown>;
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

export interface CommentBody {
  text?: string;
  parent_id?: string | null;
}

export interface InfinityAttachment {
  id: number;
  object: "attachment";
  link?: string;
  original_name?: string;
  filesize?: number;
  created_at?: string;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface ViewBody {
  folder_id?: string;
  name?: string;
  type?: string;
  sort_order?: string;
  settings?: JsonObject;
}

export interface InfinityView extends ViewBody {
  id: string;
  object: "folderview";
  created_by?: number;
  created_at?: string | null;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface ReferenceBody {
  attribute_id: string;
  from_item_id: string;
  to_item_id: string;
}

export interface InfinityReference extends ReferenceBody {
  id: string;
  object: "reference";
  [key: string]: unknown;
}

export interface HookEvent {
  event: string;
  data?: JsonValue;
}

export interface HookBody {
  url?: string;
  events?: HookEvent[];
}

export interface InfinityHook extends HookBody {
  id: string;
  object: "hook";
  user_id?: number;
  board_id?: string;
  secret?: string;
  created_at?: string;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface TimeEntryBody {
  item_id?: string;
  attribute_id?: string;
  started_at?: string | null;
  ended_at?: string | null;
  description?: string | null;
}

export interface InfinityTimeEntry extends TimeEntryBody {
  id: string;
  object: "time_entry";
  created_by?: number;
  [key: string]: unknown;
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
