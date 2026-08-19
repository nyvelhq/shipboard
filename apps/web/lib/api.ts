const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.message || body.error || 'Something went wrong.');
  }
  return body as T;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: string;
  createdAt: string;
}

export interface Space {
  id: string;
  workspaceId: string;
  name: string;
  icon: string | null;
  position: number;
}

export interface Status {
  id: string;
  name: string;
  color: string;
  category: string;
  position: number;
}

export interface ListItem {
  id: string;
  spaceId: string;
  folderId: string | null;
  name: string;
  type: string;
  position: number;
  statuses?: Status[];
}

export const api = {
  signup: (data: { email: string; name: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listWorkspaces: (token: string) => request<Workspace[]>('/workspaces', {}, token),
  createWorkspace: (token: string, name: string) =>
    request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }, token),
  getWorkspace: (token: string, workspaceId: string) =>
    request<Workspace>(`/workspaces/${workspaceId}`, {}, token),
  listSpaces: (token: string, workspaceId: string) =>
    request<Space[]>(`/workspaces/${workspaceId}/spaces`, {}, token),
  createSpace: (token: string, workspaceId: string, name: string) =>
    request<Space>(
      `/workspaces/${workspaceId}/spaces`,
      { method: 'POST', body: JSON.stringify({ name }) },
      token,
    ),
  listLists: (token: string, workspaceId: string, spaceId: string) =>
    request<ListItem[]>(`/workspaces/${workspaceId}/spaces/${spaceId}/lists`, {}, token),
  createList: (token: string, workspaceId: string, spaceId: string, name: string) =>
    request<ListItem>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists`,
      { method: 'POST', body: JSON.stringify({ name }) },
      token,
    ),
};
