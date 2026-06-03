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
  BoardBody,
  AttributeBody,
  InviteMemberBody,
  MemberBody,
  ItemBody,
  JsonValue,
  PaginationInput,
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
