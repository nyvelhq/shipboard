'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useListTasks } from '@/lib/use-list-tasks';
import { ViewToggle } from '../view-toggle';

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-gray-100 text-gray-600',
  low: 'bg-blue-100 text-blue-700',
};

export default function BoardPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ workspaceId: string; spaceId: string; listId: string }>();
  const { workspaceId, spaceId, listId } = params;

  const { list, tasks, loading, error, setError, reload } = useListTasks(token, workspaceId, spaceId, listId);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) router.replace('/login');
  }, [ready, token, router]);

  async function moveTask(taskId: string, statusId: string) {
    if (!token) return;
    setError('');
    try {
      await api.updateTask(token, workspaceId, spaceId, listId, taskId, { statusId });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to move task.');
    }
  }

  if (!ready || !token) return null;

  const statuses = list?.statuses ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl">{loading ? 'Loading…' : list?.name}</h1>
        <ViewToggle workspaceId={workspaceId} spaceId={spaceId} listId={listId} active="board" />
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((status) => {
          const columnTasks = tasks.filter((t) => t.statusId === status.id);
          const isDropTarget = dragOverStatusId === status.id;
          return (
            <div
              key={status.id}
              className={`w-72 shrink-0 rounded-lg p-3 transition-colors ${
                isDropTarget ? 'bg-teal-50 ring-2 ring-teal-300' : 'bg-gray-50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatusId(status.id);
              }}
              onDragLeave={() => setDragOverStatusId((prev) => (prev === status.id ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragTaskId) moveTask(dragTaskId, status.id);
                setDragTaskId(null);
                setDragOverStatusId(null);
              }}
            >
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
                <h2 className="text-sm font-semibold text-gray-700">{status.name}</h2>
                <span className="text-xs text-gray-400">{columnTasks.length}</span>
              </div>

              <div className="flex flex-col gap-2">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragTaskId(task.id)}
                    onDragEnd={() => {
                      setDragTaskId(null);
                      setDragOverStatusId(null);
                    }}
                    className="cursor-grab rounded-md border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                  >
                    <p className="text-sm font-medium text-gray-900">{task.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${
                          PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.normal
                        }`}
                      >
                        {task.priority}
                      </span>
                      {task.assignees[0] && (
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-700 text-[10px] font-semibold text-white"
                          title={task.assignees[0].user.name}
                        >
                          {task.assignees[0].user.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {task.dueDate && (
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
                {columnTasks.length === 0 && <p className="px-1 text-xs text-gray-300">No tasks</p>}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
