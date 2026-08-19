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

export interface CustomField {
  id: string;
  workspaceId: string;
  spaceId: string | null;
  listId: string | null;
  name: string;
  type: 'text' | 'number' | 'currency' | 'dropdown' | 'multiselect' | 'date' | 'checkbox' | 'person';
  options: string[] | null;
}

export interface CustomFieldValue {
  id: string;
  taskId: string;
  customFieldId: string;
  value: unknown;
  customField: CustomField;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string | null;
  user: { id: string; name: string; email: string };
}

export interface Attachment {
  id: string;
  taskId: string;
  uploadedBy: string;
  url: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  uploader: { id: string; name: string; email: string };
}

export interface AcceptanceCriterion {
  id: string;
  taskId: string;
  text: string;
  completed: boolean;
  position: number;
  createdAt: string;
}

export interface Sprint {
  id: string;
  listId: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'closed';
  tasks?: Task[];
}

export interface Task {
  id: string;
  listId: string;
  parentTaskId: string | null;
  statusId: string;
  sprintId: string | null;
  name: string;
  description: string | null;
  priority: string;
  storyPoints: number | null;
  startDate: string | null;
  dueDate: string | null;
  position: number;
  status: Status;
  sprint: Sprint | null;
  creator: { id: string; name: string; email: string };
  assignees: TaskAssignee[];
  customFieldValues: CustomFieldValue[];
  subtasks?: Task[];
}

export interface TaskInput {
  name?: string;
  description?: string;
  priority?: string;
  statusId?: string;
  sprintId?: string | null;
  storyPoints?: number;
  startDate?: string;
  dueDate?: string;
  assigneeIds?: string[];
  customFieldValues?: Record<string, unknown>;
}

export interface SprintInput {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
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
  deleteSpace: (token: string, workspaceId: string, spaceId: string) =>
    request<{ ok: true }>(`/workspaces/${workspaceId}/spaces/${spaceId}`, { method: 'DELETE' }, token),
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

  listCustomFields: (token: string, workspaceId: string, spaceId: string, listId: string) =>
    request<CustomField[]>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/custom-fields`,
      {},
      token,
    ),
  createCustomField: (
    token: string,
    workspaceId: string,
    input: { name: string; type: string; options?: string[]; spaceId?: string; listId?: string },
  ) => request<CustomField>(`/workspaces/${workspaceId}/custom-fields`, { method: 'POST', body: JSON.stringify(input) }, token),
  deleteCustomField: (token: string, workspaceId: string, fieldId: string) =>
    request<{ ok: true }>(`/workspaces/${workspaceId}/custom-fields/${fieldId}`, { method: 'DELETE' }, token),

  listComments: (token: string, workspaceId: string, spaceId: string, listId: string, taskId: string) =>
    request<Comment[]>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/comments`,
      {},
      token,
    ),
  createComment: (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    body: string,
  ) =>
    request<Comment>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/comments`,
      { method: 'POST', body: JSON.stringify({ body }) },
      token,
    ),
  deleteComment: (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    commentId: string,
  ) =>
    request<{ ok: true }>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/comments/${commentId}`,
      { method: 'DELETE' },
      token,
    ),

  listAttachments: (token: string, workspaceId: string, spaceId: string, listId: string, taskId: string) =>
    request<Attachment[]>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/attachments`,
      {},
      token,
    ),
  uploadAttachment: async (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    file: File,
  ) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(
      `${API_URL}/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/attachments`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
    );
    const responseBody = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(responseBody.message || 'Upload failed.');
    return responseBody as Attachment;
  },
  createLinkAttachment: (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    url: string,
    label?: string,
  ) =>
    request<Attachment>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/attachments/link`,
      { method: 'POST', body: JSON.stringify({ url, label }) },
      token,
    ),
  deleteAttachment: (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    attachmentId: string,
  ) =>
    request<{ ok: true }>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/attachments/${attachmentId}`,
      { method: 'DELETE' },
      token,
    ),

  listSprints: (token: string, workspaceId: string, spaceId: string, listId: string) =>
    request<Sprint[]>(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/sprints`, {}, token),
  createSprint: (token: string, workspaceId: string, spaceId: string, listId: string, input: SprintInput) =>
    request<Sprint>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/sprints`,
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),
  getSprint: (token: string, workspaceId: string, spaceId: string, listId: string, sprintId: string) =>
    request<Sprint>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/sprints/${sprintId}`,
      {},
      token,
    ),
  updateSprint: (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    sprintId: string,
    input: SprintInput,
  ) =>
    request<Sprint>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/sprints/${sprintId}`,
      { method: 'PATCH', body: JSON.stringify(input) },
      token,
    ),
  deleteSprint: (token: string, workspaceId: string, spaceId: string, listId: string, sprintId: string) =>
    request<{ ok: true }>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/sprints/${sprintId}`,
      { method: 'DELETE' },
      token,
    ),

  listAcceptanceCriteria: (token: string, workspaceId: string, spaceId: string, listId: string, taskId: string) =>
    request<AcceptanceCriterion[]>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/acceptance-criteria`,
      {},
      token,
    ),
  createAcceptanceCriterion: (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    text: string,
  ) =>
    request<AcceptanceCriterion>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/acceptance-criteria`,
      { method: 'POST', body: JSON.stringify({ text }) },
      token,
    ),
  updateAcceptanceCriterion: (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    criterionId: string,
    input: { text?: string; completed?: boolean },
  ) =>
    request<AcceptanceCriterion>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/acceptance-criteria/${criterionId}`,
      { method: 'PATCH', body: JSON.stringify(input) },
      token,
    ),
  deleteAcceptanceCriterion: (
    token: string,
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    criterionId: string,
  ) =>
    request<{ ok: true }>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks/${taskId}/acceptance-criteria/${criterionId}`,
      { method: 'DELETE' },
      token,
    ),
};

export { API_URL };
