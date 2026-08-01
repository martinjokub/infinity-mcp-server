import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type Method } from "axios";
import { DEFAULT_API_BASE_URL, DEFAULT_API_VERSION, DEFAULT_LIMIT } from "../constants.js";
import type {
  FolderBody,
  InfinityAttribute,
  InfinityBoard,
  InfinityFolder,
  InfinityItem,
  InfinityPage,
  InfinityWorkspace,
  InfinityMember,
  InfinityComment,
  BoardBody,
  AttributeBody,
  InviteMemberBody,
  MemberBody,
  ItemBody,
  CommentBody,
  HookBody,
  InfinityAttachment,
  InfinityHook,
  InfinityReference,
  InfinityTimeEntry,
  InfinityView,
  JsonValue,
  PaginationInput,
  ReferenceBody,
  TimeEntryBody,
  ViewBody,
} from "../types.js";

export class InfinityClient {
  private readonly http: AxiosInstance;

  constructor(options?: { token?: string; baseUrl?: string; apiVersion?: string }) {
    const token = options?.token ?? process.env.INFINITY_API_TOKEN;
    if (!token) {
      throw new Error("INFINITY_API_TOKEN environment variable is required.");
    }

    this.http = axios.create({
      baseURL: options?.baseUrl ?? process.env.INFINITY_API_BASE_URL ?? DEFAULT_API_BASE_URL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Version": options?.apiVersion ?? process.env.INFINITY_API_VERSION ?? DEFAULT_API_VERSION,
      },
    });
  }

  async getProfile(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/profile");
  }

  async listWorkspaces(params: PaginationInput = {}): Promise<InfinityPage<InfinityWorkspace>> {
    return this.list<InfinityWorkspace>("/workspaces", params);
  }

  async listMembers(workspaceId: string, params: PaginationInput = {}): Promise<InfinityPage<InfinityMember>> {
    return this.list<InfinityMember>(`/workspaces/${workspaceId}/members`, params);
  }

  async inviteMember(workspaceId: string, body: InviteMemberBody): Promise<InfinityMember> {
    return this.request<InfinityMember>("POST", `/workspaces/${workspaceId}/members/invite`, body);
  }

  async addMember(workspaceId: string, userId: number, body: MemberBody): Promise<InfinityMember> {
    return this.request<InfinityMember>("PUT", `/workspaces/${workspaceId}/members/${userId}`, body);
  }

  async removeMember(workspaceId: string, userId: number): Promise<InfinityMember> {
    return this.request<InfinityMember>("DELETE", `/workspaces/${workspaceId}/members/${userId}`);
  }

  async listBoards(workspaceId: string, params: PaginationInput = {}): Promise<InfinityPage<InfinityBoard>> {
    return this.list<InfinityBoard>(`/workspaces/${workspaceId}/boards`, params);
  }

  async getBoard(workspaceId: string, boardId: string): Promise<InfinityBoard> {
    return this.request<InfinityBoard>("GET", `/workspaces/${workspaceId}/boards/${boardId}`);
  }

  async createBoard(workspaceId: string, body: BoardBody): Promise<InfinityBoard> {
    return this.request<InfinityBoard>("POST", `/workspaces/${workspaceId}/boards`, body);
  }

  async listFolders(workspaceId: string, boardId: string, params: PaginationInput = {}): Promise<InfinityPage<InfinityFolder>> {
    return this.list<InfinityFolder>(`/workspaces/${workspaceId}/boards/${boardId}/folders`, params);
  }

  async getFolder(workspaceId: string, boardId: string, folderId: string): Promise<InfinityFolder> {
    return this.request<InfinityFolder>("GET", `/workspaces/${workspaceId}/boards/${boardId}/folders/${folderId}`);
  }

  async createFolder(workspaceId: string, boardId: string, body: FolderBody): Promise<InfinityFolder> {
    return this.request<InfinityFolder>("POST", `/workspaces/${workspaceId}/boards/${boardId}/folders`, body);
  }

  async updateFolder(workspaceId: string, boardId: string, folderId: string, body: FolderBody): Promise<InfinityFolder> {
    return this.request<InfinityFolder>("PUT", `/workspaces/${workspaceId}/boards/${boardId}/folders/${folderId}`, body);
  }

  async archiveFolder(workspaceId: string, boardId: string, folderId: string): Promise<InfinityFolder> {
    return this.request<InfinityFolder>("DELETE", `/workspaces/${workspaceId}/boards/${boardId}/folders/${folderId}`);
  }

  async listAttributes(workspaceId: string, boardId: string, params: PaginationInput = {}): Promise<InfinityPage<InfinityAttribute>> {
    return this.list<InfinityAttribute>(`/workspaces/${workspaceId}/boards/${boardId}/attributes`, params);
  }

  async getAttribute(workspaceId: string, boardId: string, attributeId: string): Promise<InfinityAttribute> {
    return this.request<InfinityAttribute>("GET", `/workspaces/${workspaceId}/boards/${boardId}/attributes/${attributeId}`);
  }

  async createAttribute(workspaceId: string, boardId: string, body: AttributeBody): Promise<InfinityAttribute> {
    return this.request<InfinityAttribute>("POST", `/workspaces/${workspaceId}/boards/${boardId}/attributes`, body);
  }

  async updateAttribute(workspaceId: string, boardId: string, attributeId: string, body: AttributeBody): Promise<InfinityAttribute> {
    return this.request<InfinityAttribute>("PUT", `/workspaces/${workspaceId}/boards/${boardId}/attributes/${attributeId}`, body);
  }

  async deleteAttribute(workspaceId: string, boardId: string, attributeId: string): Promise<InfinityAttribute> {
    return this.request<InfinityAttribute>("DELETE", `/workspaces/${workspaceId}/boards/${boardId}/attributes/${attributeId}`);
  }

  async listItems(workspaceId: string, boardId: string, params: PaginationInput & { folder_id?: string } = {}): Promise<InfinityPage<InfinityItem>> {
    return this.list<InfinityItem>(`/workspaces/${workspaceId}/boards/${boardId}/items`, params);
  }

  async getItem(workspaceId: string, boardId: string, itemId: string, params: { expand?: string[] } = {}): Promise<InfinityItem> {
    return this.request<InfinityItem>("GET", `/workspaces/${workspaceId}/boards/${boardId}/items/${itemId}`, undefined, params);
  }

  async createItem(workspaceId: string, boardId: string, body: ItemBody): Promise<InfinityItem> {
    return this.request<InfinityItem>("POST", `/workspaces/${workspaceId}/boards/${boardId}/items`, body);
  }

  async updateItem(workspaceId: string, boardId: string, itemId: string, body: ItemBody): Promise<InfinityItem> {
    return this.request<InfinityItem>("PUT", `/workspaces/${workspaceId}/boards/${boardId}/items/${itemId}`, body);
  }

  async archiveItem(workspaceId: string, boardId: string, itemId: string): Promise<InfinityItem> {
    return this.request<InfinityItem>("DELETE", `/workspaces/${workspaceId}/boards/${boardId}/items/${itemId}`);
  }

  async listSubitems(
    workspaceId: string,
    boardId: string,
    parentItemId: string,
    params: PaginationInput & { folder_id?: string } = {},
  ): Promise<InfinityPage<InfinityItem>> {
    const page = await this.listItems(workspaceId, boardId, params);
    return {
      ...page,
      data: page.data.filter((item) => item.parent_id === parentItemId),
      has_more: page.has_more,
    };
  }

  async listComments(
    workspaceId: string,
    boardId: string,
    itemId: string,
    params: PaginationInput = {},
  ): Promise<InfinityPage<InfinityComment>> {
    return this.list<InfinityComment>(`/workspaces/${workspaceId}/boards/${boardId}/items/${itemId}/comments`, params);
  }

  async getComment(
    workspaceId: string,
    boardId: string,
    itemId: string,
    commentId: string,
    params: { expand?: string[] } = {},
  ): Promise<InfinityComment> {
    return this.request<InfinityComment>(
      "GET",
      `/workspaces/${workspaceId}/boards/${boardId}/items/${itemId}/comments/${commentId}`,
      undefined,
      params,
    );
  }

  async createComment(workspaceId: string, boardId: string, itemId: string, body: CommentBody): Promise<InfinityComment> {
    return this.request<InfinityComment>("POST", `/workspaces/${workspaceId}/boards/${boardId}/items/${itemId}/comments`, body);
  }

  async updateComment(
    workspaceId: string,
    boardId: string,
    itemId: string,
    commentId: string,
    body: CommentBody,
  ): Promise<InfinityComment> {
    return this.request<InfinityComment>(
      "PUT",
      `/workspaces/${workspaceId}/boards/${boardId}/items/${itemId}/comments/${commentId}`,
      body,
    );
  }

  async deleteComment(workspaceId: string, boardId: string, itemId: string, commentId: string): Promise<InfinityComment> {
    return this.request<InfinityComment>("DELETE", `/workspaces/${workspaceId}/boards/${boardId}/items/${itemId}/comments/${commentId}`);
  }

  async uploadAttachmentFromUrl(workspaceId: string, url: string): Promise<InfinityAttachment> {
    return this.request<InfinityAttachment>("POST", `/workspaces/${workspaceId}/attachments/url`, { url });
  }

  async uploadAttachmentFromBase64(
    workspaceId: string,
    fileName: string,
    contentBase64: string,
    contentType?: string,
  ): Promise<InfinityAttachment> {
    const content = Buffer.from(contentBase64, "base64");
    if (content.length === 0) throw new Error("Attachment content_base64 did not contain a file.");

    const form = new FormData();
    form.append("file", new Blob([content], { type: contentType || "application/octet-stream" }), fileName);
    return this.request<InfinityAttachment>("POST", `/workspaces/${workspaceId}/attachments/file`, form);
  }

  async listViews(
    workspaceId: string,
    boardId: string,
    params: PaginationInput & { folder_id?: string } = {},
  ): Promise<InfinityPage<InfinityView>> {
    return this.list<InfinityView>(`/workspaces/${workspaceId}/boards/${boardId}/views`, params);
  }

  async getView(workspaceId: string, boardId: string, viewId: string): Promise<InfinityView> {
    return this.request<InfinityView>("GET", `/workspaces/${workspaceId}/boards/${boardId}/views/${viewId}`);
  }

  async createView(workspaceId: string, boardId: string, body: ViewBody): Promise<InfinityView> {
    return this.request<InfinityView>("POST", `/workspaces/${workspaceId}/boards/${boardId}/views`, body);
  }

  async updateView(workspaceId: string, boardId: string, viewId: string, body: ViewBody): Promise<InfinityView> {
    return this.request<InfinityView>("PUT", `/workspaces/${workspaceId}/boards/${boardId}/views/${viewId}`, body);
  }

  async deleteView(workspaceId: string, boardId: string, viewId: string): Promise<InfinityView> {
    return this.request<InfinityView>("DELETE", `/workspaces/${workspaceId}/boards/${boardId}/views/${viewId}`);
  }

  async createReference(workspaceId: string, boardId: string, body: ReferenceBody): Promise<InfinityReference> {
    return this.request<InfinityReference>("POST", `/workspaces/${workspaceId}/boards/${boardId}/references`, body);
  }

  async deleteReference(workspaceId: string, boardId: string, referenceId: string): Promise<InfinityReference> {
    return this.request<InfinityReference>("DELETE", `/workspaces/${workspaceId}/boards/${boardId}/references/${referenceId}`);
  }

  async listHooks(workspaceId: string, boardId: string, params: PaginationInput = {}): Promise<InfinityPage<InfinityHook>> {
    return this.list<InfinityHook>(`/workspaces/${workspaceId}/boards/${boardId}/hooks`, params);
  }

  async createHook(workspaceId: string, boardId: string, body: HookBody): Promise<InfinityHook> {
    return this.request<InfinityHook>("POST", `/workspaces/${workspaceId}/boards/${boardId}/hooks`, body);
  }

  async updateHook(workspaceId: string, boardId: string, hookId: string, body: HookBody): Promise<InfinityHook> {
    return this.request<InfinityHook>("PUT", `/workspaces/${workspaceId}/boards/${boardId}/hooks/${hookId}`, body);
  }

  async deleteHook(workspaceId: string, boardId: string, hookId: string): Promise<InfinityHook> {
    return this.request<InfinityHook>("DELETE", `/workspaces/${workspaceId}/boards/${boardId}/hooks/${hookId}`);
  }

  async createTimeEntry(workspaceId: string, boardId: string, body: TimeEntryBody): Promise<InfinityTimeEntry> {
    return this.request<InfinityTimeEntry>("POST", `/workspaces/${workspaceId}/boards/${boardId}/time-tracking`, body);
  }

  async updateTimeEntry(
    workspaceId: string,
    boardId: string,
    timeEntryId: string,
    body: TimeEntryBody,
  ): Promise<InfinityTimeEntry> {
    return this.request<InfinityTimeEntry>("PUT", `/workspaces/${workspaceId}/boards/${boardId}/time-tracking/${timeEntryId}`, body);
  }

  async deleteTimeEntry(workspaceId: string, boardId: string, timeEntryId: string): Promise<InfinityTimeEntry> {
    return this.request<InfinityTimeEntry>("DELETE", `/workspaces/${workspaceId}/boards/${boardId}/time-tracking/${timeEntryId}`);
  }

  private async list<T>(path: string, params: PaginationInput & { folder_id?: string } = {}): Promise<InfinityPage<T>> {
    const response = await this.request<InfinityPage<T>>("GET", path, undefined, {
      limit: DEFAULT_LIMIT,
      ...params,
    });

    return {
      has_more: Boolean(response.has_more),
      before: response.before ?? null,
      after: response.after ?? null,
      data: Array.isArray(response.data) ? response.data : [],
    };
  }

  private async request<T>(
    method: Method,
    url: string,
    data?: unknown,
    params?: Record<string, JsonValue | undefined>,
  ): Promise<T> {
    try {
      const config: AxiosRequestConfig = { method, url, data, params: removeEmptyParams(params) };
      if (data instanceof FormData) {
        delete (config.headers as Record<string, string> | undefined)?.["Content-Type"];
      }
      const response = await this.http.request<T>(config);
      return response.data;
    } catch (error) {
      throw toInfinityError(error);
    }
  }
}

function removeEmptyParams(params?: Record<string, JsonValue | undefined>): Record<string, JsonValue> | undefined {
  if (!params) return undefined;
  const output: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") output[key] = value;
  }
  return output;
}

function toInfinityError(error: unknown): Error {
  if (error instanceof AxiosError) {
    if (error.response) {
      const details = typeof error.response.data === "string" ? error.response.data : JSON.stringify(error.response.data);
      return new Error(`Infinity API ${error.response.status}: ${details}. Check IDs, token permissions, and INFINITY_API_VERSION.`);
    }
    if (error.code === "ECONNABORTED") {
      return new Error("Infinity API request timed out. Try again or reduce the requested page size.");
    }
  }

  return error instanceof Error ? error : new Error(String(error));
}
