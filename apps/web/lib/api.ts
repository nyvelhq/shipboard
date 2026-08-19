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

export interface Member {
  workspaceId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

export interface TaskAssignee {
  taskId: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

export interface Task {
  id: string;
  listId: string;
  parentTaskId: string | null;
  statusId: string;
  name: string;
  description: string | null;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  position: number;
  status: Status;
  assignees: TaskAssignee[];
  subtasks?: Task[];
}

export interface TaskInput {
  name?: string;
  description?: string;
  priority?: string;
  statusId?: string;
  startDate?: string;
  dueDate?: string;
  assigneeIds?: string[];
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
  getList: (token: string, workspaceId: string, spaceId: string, listId: string) =>
    request<ListItem>(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}`, {}, token),
  listMembers: (token: string, workspaceId: string) =>
    request<Member[]>(`/workspaces/${workspaceId}/members`, {}, token),

  listTasks: (token: string, workspaceId: string, spaceId: string, listId: string) =>
    request<Task[]>(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks`, {}, token),
  createTask: (token: string, workspaceId: string, spaceId: string, listId: string, input: TaskInput) =>
    request<Task>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks`,
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),
  updateTask: (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    input: TaskInput,
  ) =>
    request<Task>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}`,
      { method: 'PATCH', body: JSON.stringify(input) },
      token,
    ),
  deleteTask: (token: string, workspaceId: string, spaceId: string, listId: string, taskId: string) =>
    request<{ ok: true }>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}`,
      { method: 'DELETE' },
      token,
    ),
  createSubtask: (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    input: TaskInput,
  ) =>
    request<Task>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/subtasks`,
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),
};
