'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, ListItem, Member, Task, TaskInput } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { TaskRow } from './task-row';

export default function ListDetailPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ workspaceId: string; spaceId: string; listId: string }>();
  const { workspaceId, spaceId, listId } = params;

  const [list, setList] = useState<ListItem | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [subtaskDraft, setSubtaskDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, listId]);

  async function load(currentToken: string) {
    setLoading(true);
    setError('');
    try {
      const [listData, taskData, memberData] = await Promise.all([
        api.getList(currentToken, workspaceId, spaceId, listId),
        api.listTasks(currentToken, workspaceId, spaceId, listId),
        api.listMembers(currentToken, workspaceId),
      ]);
      setList(listData);
      setTasks(taskData);
      setMembers(memberData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load list.');
    } finally {
      setLoading(false);
    }
  }

  async function createTask(e: FormEvent) {
    e.preventDefault();
    if (!token || !newTaskName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.createTask(token, workspaceId, spaceId, listId, { name: newTaskName.trim() });
      setNewTaskName('');
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create task.');
    } finally {
      setCreating(false);
    }
  }

  async function patchTask(taskId: string, input: TaskInput) {
    if (!token) return;
    setError('');
    try {
      await api.updateTask(token, workspaceId, spaceId, listId, taskId, input);
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update task.');
    }
  }

  async function removeTask(taskId: string) {
    if (!token) return;
    setError('');
    try {
      await api.deleteTask(token, workspaceId, spaceId, listId, taskId);
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete task.');
    }
  }

  async function addSubtask(parentId: string) {
    const name = (subtaskDraft[parentId] || '').trim();
    if (!token || !name) return;
    setError('');
    try {
      await api.createSubtask(token, workspaceId, spaceId, listId, parentId, { name });
      setSubtaskDraft((prev) => ({ ...prev, [parentId]: '' }));
      setExpanded((prev) => ({ ...prev, [parentId]: true }));
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add subtask.');
    }
  }

  if (!ready || !token) return null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href={`/workspaces/${workspaceId}`} className="text-sm text-teal-700 hover:underline">
        &larr; Back to workspace
      </Link>
      <h1 className="mb-6 mt-2">{loading ? 'Loading…' : list?.name}</h1>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <form onSubmit={createTask} className="mb-6 flex gap-2">
        <input
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          placeholder="New task name"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          {creating ? 'Adding…' : 'Add task'}
        </button>
      </form>

      {!loading && tasks.length === 0 && (
        <p className="text-gray-500">No tasks yet — add your first one above.</p>
      )}

      {tasks.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2">Task</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Assignee</th>
                <th className="px-3 py-2">Due</th>
                <th className="w-8 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  depth={0}
                  statuses={list?.statuses ?? []}
                  members={members}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  onPatch={patchTask}
                  onDelete={removeTask}
                  onAddSubtask={addSubtask}
                  subtaskDraft={subtaskDraft}
                  setSubtaskDraft={setSubtaskDraft}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
