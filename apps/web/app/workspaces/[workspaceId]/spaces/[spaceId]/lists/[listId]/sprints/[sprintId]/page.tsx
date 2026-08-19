'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError, Sprint, Task, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-gray-200 text-gray-500',
};

export default function SprintDetailPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ workspaceId: string; spaceId: string; listId: string; sprintId: string }>();
  const { workspaceId, spaceId, listId, sprintId } = params;

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [backlog, setBacklog] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, sprintId]);

  async function load(currentToken: string) {
    setLoading(true);
    setError('');
    try {
      const [sprintData, allTasks] = await Promise.all([
        api.getSprint(currentToken, workspaceId, spaceId, listId, sprintId),
        api.listTasks(currentToken, workspaceId, spaceId, listId),
      ]);
      setSprint(sprintData);
      setBacklog(allTasks.filter((t) => t.sprintId === null));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load sprint.');
    } finally {
      setLoading(false);
    }
  }

  async function moveToSprint(taskId: string) {
    if (!token) return;
    setError('');
    try {
      await api.updateTask(token, workspaceId, spaceId, listId, taskId, { sprintId });
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add task to sprint.');
    }
  }

  async function removeFromSprint(taskId: string) {
    if (!token) return;
    setError('');
    try {
      await api.updateTask(token, workspaceId, spaceId, listId, taskId, { sprintId: null });
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove task from sprint.');
    }
  }

  async function setStoryPoints(taskId: string, storyPoints: number) {
    if (!token) return;
    setError('');
    try {
      await api.updateTask(token, workspaceId, spaceId, listId, taskId, { storyPoints });
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update story points.');
    }
  }

  async function setStatus(status: string) {
    if (!token) return;
    setError('');
    try {
      await api.updateSprint(token, workspaceId, spaceId, listId, sprintId, { status });
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update sprint status.');
    }
  }

  if (!ready || !token) return null;

  const sprintTasks = sprint?.tasks ?? [];
  const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
  const donePoints = sprintTasks
    .filter((t) => t.status.category === 'done')
    .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/sprints`}
        className="text-sm text-teal-700 hover:underline"
      >
        &larr; All sprints
      </Link>

      {error && <p className="mb-4 mt-3 text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-3">Loading…</p>
      ) : sprint ? (
        <>
          <div className="mb-1 mt-2 flex items-center gap-3">
            <h1>{sprint.name}</h1>
            <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[sprint.status]}`}>
              {sprint.status}
            </span>
          </div>
          {sprint.goal && <p className="mb-1 text-gray-600">{sprint.goal}</p>}
          <p className="mb-4 text-sm text-gray-400">
            {new Date(sprint.startDate).toLocaleDateString()} &ndash; {new Date(sprint.endDate).toLocaleDateString()}
          </p>

          <div className="mb-6 flex items-center gap-3">
            {sprint.status === 'planned' && (
              <button
                type="button"
                onClick={() => setStatus('active')}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Start sprint
              </button>
            )}
            {sprint.status === 'active' && (
              <button
                type="button"
                onClick={() => setStatus('closed')}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Close sprint
              </button>
            )}
            <span className="text-sm text-gray-500">
              Velocity: <span className="font-semibold text-gray-800">{donePoints}</span> / {totalPoints} points done
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                In this sprint ({sprintTasks.length})
              </h2>
              <div className="flex flex-col gap-2">
                {sprintTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{task.name}</p>
                      <p className="text-xs" style={{ color: task.status.color }}>
                        {task.status.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        defaultValue={task.storyPoints ?? ''}
                        placeholder="pts"
                        onBlur={(e) => {
                          const value = Number(e.target.value);
                          if (e.target.value !== '' && value !== task.storyPoints) setStoryPoints(task.id, value);
                        }}
                        className="w-14 rounded border border-gray-200 px-1.5 py-1 text-center text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeFromSprint(task.id)}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {sprintTasks.length === 0 && (
                  <p className="text-sm text-gray-400">No tasks yet — add some from the backlog.</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Backlog ({backlog.length})
              </h2>
              <div className="flex flex-col gap-2">
                {backlog.map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <p className="truncate text-sm font-medium text-gray-900">{task.name}</p>
                    <button
                      type="button"
                      onClick={() => moveToSprint(task.id)}
                      className="shrink-0 text-xs font-medium text-teal-700 hover:underline"
                    >
                      + Add
                    </button>
                  </div>
                ))}
                {backlog.length === 0 && <p className="text-sm text-gray-400">Backlog is empty.</p>}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </main>
  );
}
