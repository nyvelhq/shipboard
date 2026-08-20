'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowDown, ArrowUp, LucideIcon, Minus } from 'lucide-react';
import { ApiError, CustomField, Member, Sprint, Task, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useListTasks } from '@/lib/use-list-tasks';
import { useToast } from '@/components/toast/toast-context';
import { Skeleton } from '@/components/skeleton';
import { ViewToggle } from '../view-toggle';

const PRIORITY_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  urgent: { icon: AlertTriangle, color: 'text-red-600', label: 'Urgent priority' },
  high: { icon: ArrowUp, color: 'text-orange-500', label: 'High priority' },
  normal: { icon: Minus, color: 'text-gray-400', label: 'Normal priority' },
  low: { icon: ArrowDown, color: 'text-blue-500', label: 'Low priority' },
};

const BACKLOG_FILTER = 'backlog';
const ALL_SPRINTS_FILTER = 'all';

export default function BoardPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const params = useParams<{ workspaceId: string; spaceId: string; listId: string }>();
  const { workspaceId, spaceId, listId } = params;

  const { list, tasks, members, customFields, loading, error, setError, reload } = useListTasks(
    token,
    workspaceId,
    spaceId,
    listId,
  );
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintFilter, setSprintFilter] = useState<string>(ALL_SPRINTS_FILTER);

  useEffect(() => {
    if (!ready) return;
    if (!token) router.replace('/login');
  }, [ready, token, router]);

  useEffect(() => {
    if (!token) return;
    api
      .listSprints(token, workspaceId, spaceId, listId)
      .then(setSprints)
      .catch(() => undefined);
  }, [token, workspaceId, spaceId, listId]);

  async function moveTask(taskId: string, statusId: string) {
    if (!token) return;
    setError('');
    try {
      await api.updateTask(token, workspaceId, spaceId, listId, taskId, { statusId });
      await reload();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to move task.';
      setError(message);
      toast.error(message);
    }
  }

  if (!ready || !token) return null;

  const statuses = list?.statuses ?? [];
  const sprintFilteredTasks = tasks.filter((t) => {
    if (sprintFilter === ALL_SPRINTS_FILTER) return true;
    if (sprintFilter === BACKLOG_FILTER) return !t.sprintId;
    return t.sprintId === sprintFilter;
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{loading ? 'Loading…' : list?.name}</h1>
        <div className="flex items-center gap-2">
          {sprints.length > 0 && (
            <select
              value={sprintFilter}
              onChange={(e) => setSprintFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value={ALL_SPRINTS_FILTER}>All sprints</option>
              <option value={BACKLOG_FILTER}>Backlog</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <ViewToggle workspaceId={workspaceId} spaceId={spaceId} listId={listId} active="board" />
        </div>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {loading && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-72 shrink-0" />
          ))}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {!loading && statuses.map((status) => {
          const columnTasks = sprintFilteredTasks.filter((t) => t.statusId === status.id);
          const isDropTarget = dragOverStatusId === status.id;
          return (
            <div
              key={status.id}
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
              style={{ borderTop: `3px solid ${status.color}` }}
              className={`flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-gray-50 transition-all ${
                isDropTarget ? 'border-teal-300 ring-2 ring-teal-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <h2 className="text-sm font-semibold text-gray-700">{status.name}</h2>
                <span className="ml-auto rounded-full bg-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 px-2.5 pb-2.5">
                {columnTasks.map((task) => (
                  <BoardCard
                    key={task.id}
                    task={task}
                    customFields={customFields}
                    members={members}
                    showSprintBadge={sprintFilter === ALL_SPRINTS_FILTER}
                    dragging={dragTaskId === task.id}
                    onDragStart={() => setDragTaskId(task.id)}
                    onDragEnd={() => {
                      setDragTaskId(null);
                      setDragOverStatusId(null);
                    }}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 py-6 text-xs text-gray-400">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function formatFieldValue(value: unknown, field: CustomField, members: Member[]): string | null {
  if (value == null || value === '') return null;
  if (field.type === 'checkbox') return value ? field.name : null;
  if (field.type === 'person') {
    const member = members.find((m) => m.userId === value);
    return member ? member.user.name : null;
  }
  if (field.type === 'date') {
    const parsed = new Date(value as string);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
  }
  if (field.type === 'currency') return `$${value}`;
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : null;
  return String(value);
}

function BoardCard({
  task,
  customFields,
  members,
  showSprintBadge,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  customFields: CustomField[];
  members: Member[];
  showSprintBadge: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;
  const PriorityIcon = priority.icon;
  const fieldBadges = customFields
    .map((field) => {
      const raw = task.customFieldValues.find((v) => v.customFieldId === field.id)?.value;
      const label = formatFieldValue(raw, field, members);
      return label ? { field, label } : null;
    })
    .filter((b): b is { field: CustomField; label: string } => b !== null);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-md border border-gray-200 bg-white p-2.5 shadow-sm transition-all duration-150 hover:border-gray-300 hover:shadow-md active:cursor-grabbing ${
        dragging ? 'rotate-1 opacity-40 shadow-md' : ''
      }`}
    >
      <p className="mb-1.5 line-clamp-2 text-sm font-medium leading-snug text-gray-900">{task.name}</p>
      {task.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${tag.color}1a`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      {fieldBadges.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {fieldBadges.map(({ field, label }) => (
            <span
              key={field.id}
              title={field.name}
              className="max-w-full truncate rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
            >
              {field.name}: {label}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PriorityIcon size={13} className={priority.color} aria-label={priority.label} />
          {task.storyPoints != null && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
              {task.storyPoints}
            </span>
          )}
        </div>
        {task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((a) => (
              <span
                key={a.userId}
                title={a.user.name}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[10px] font-semibold text-white ring-2 ring-white"
              >
                {a.user.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
            {task.assignees.length > 3 && (
              <span
                title={task.assignees
                  .slice(3)
                  .map((a) => a.user.name)
                  .join(', ')}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-300 text-[9px] font-semibold text-gray-700 ring-2 ring-white"
              >
                +{task.assignees.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      {(task.dueDate || showSprintBadge) && (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-400">
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
          </span>
          {showSprintBadge && (
            <span className="truncate rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              {task.sprint ? task.sprint.name : 'Backlog'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
