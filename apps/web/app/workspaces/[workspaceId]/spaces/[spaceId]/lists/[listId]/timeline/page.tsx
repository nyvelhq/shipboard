'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Task, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useListTasks } from '@/lib/use-list-tasks';
import { Skeleton } from '@/components/skeleton';
import { ViewToggle } from '../view-toggle';
import { TaskDetailPanel } from '../task-detail-panel';

const DAY_WIDTH = 28;
const ROW_HEIGHT = 40;
const TASK_COL_WIDTH = 192; // matches Tailwind's w-48

function toDateOnly(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}
function isWeekend(date: Date): boolean {
  const d = date.getUTCDay();
  return d === 0 || d === 6;
}
function isSameDay(a: Date, b: Date): boolean {
  return dayDiff(a, b) === 0;
}
function isFirstOfMonth(date: Date): boolean {
  return date.getUTCDate() === 1;
}
function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

function findTask(tasks: Task[], taskId: string): Task | undefined {
  for (const task of tasks) {
    if (task.id === taskId) return task;
    const sub = task.subtasks?.find((s) => s.id === taskId);
    if (sub) return sub;
  }
  return undefined;
}

export default function TimelinePage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ workspaceId: string; spaceId: string; listId: string }>();
  const { workspaceId, spaceId, listId } = params;

  const { list, tasks, members, customFields, loading, reload } = useListTasks(
    token,
    workspaceId,
    spaceId,
    listId,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) router.replace('/login');
  }, [ready, token, router]);

  const today = useMemo(() => toDateOnly(new Date().toISOString()), []);

  const { rangeStart, days, dated, undated } = useMemo(() => {
    const datedTasks = tasks.filter((t) => t.startDate || t.dueDate);
    const undatedTasks = tasks.filter((t) => !t.startDate && !t.dueDate);

    let minTime = today.getTime();
    let maxTime = addDays(today, 28).getTime();

    if (datedTasks.length > 0) {
      const starts = datedTasks.map((t) => toDateOnly(t.startDate ?? t.dueDate!).getTime());
      const ends = datedTasks.map((t) => toDateOnly(t.dueDate ?? t.startDate!).getTime());
      minTime = Math.min(...starts, today.getTime());
      maxTime = Math.max(...ends, today.getTime());
    }

    const start = addDays(new Date(minTime), -2);
    const end = addDays(new Date(maxTime), 2);
    const totalDays = dayDiff(start, end) + 1;
    const dayList = Array.from({ length: totalDays }, (_, i) => addDays(start, i));

    return { rangeStart: start, days: dayList, dated: datedTasks, undated: undatedTasks };
  }, [tasks, today]);

  if (!ready || !token) return null;

  const selectedTask = selectedTaskId ? findTask(tasks, selectedTaskId) : undefined;

  async function patchTask(taskId: string, input: Parameters<typeof api.updateTask>[5]) {
    if (!token) return;
    await api.updateTask(token, workspaceId, spaceId, listId, taskId, input);
    await reload();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl">{loading ? 'Loading…' : list?.name}</h1>
        <ViewToggle workspaceId={workspaceId} spaceId={spaceId} listId={listId} active="timeline" />
      </div>

      {loading && <Skeleton className="h-72 w-full" />}

      {!loading && dated.length === 0 && (
        <p className="mb-4 text-sm text-gray-500">
          No tasks have dates yet — open a task&apos;s details to set a start/due date and it&apos;ll show up
          here.
        </p>
      )}

      {dated.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <div className="inline-block min-w-full">
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div
                className="shrink-0 border-r border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
                style={{ width: TASK_COL_WIDTH }}
              >
                Task
              </div>
              <div className="flex">
                {days.map((day, i) => (
                  <div
                    key={i}
                    style={{ width: DAY_WIDTH }}
                    className={`shrink-0 border-r border-gray-100 py-2 text-center text-[10px] ${
                      isSameDay(day, today)
                        ? 'bg-red-50 text-red-600'
                        : isWeekend(day)
                          ? 'bg-gray-100 text-gray-400'
                          : 'text-gray-500'
                    }`}
                  >
                    <div className="font-semibold text-gray-600">
                      {isFirstOfMonth(day) || i === 0 ? monthLabel(day) : ' '}
                    </div>
                    <div>{day.getUTCDate()}</div>
                  </div>
                ))}
              </div>
            </div>

            {dated.map((task) => {
              const barStart = toDateOnly(task.startDate ?? task.dueDate!);
              const barEnd = toDateOnly(task.dueDate ?? task.startDate!);
              const left = dayDiff(rangeStart, barStart) * DAY_WIDTH;
              const width = Math.max((dayDiff(barStart, barEnd) + 1) * DAY_WIDTH - 4, DAY_WIDTH - 4);

              return (
                <div key={task.id} className="flex border-b border-gray-100" style={{ height: ROW_HEIGHT }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className="shrink-0 truncate border-r border-gray-200 px-3 text-left text-sm text-gray-800 hover:text-teal-700"
                    style={{ width: TASK_COL_WIDTH, lineHeight: `${ROW_HEIGHT}px` }}
                    title={task.name}
                  >
                    {task.name}
                  </button>
                  <div className="relative" style={{ width: days.length * DAY_WIDTH }}>
                    {days.map((day, i) =>
                      isSameDay(day, today) || isWeekend(day) ? (
                        <div
                          key={i}
                          className={`absolute top-0 h-full ${isSameDay(day, today) ? 'bg-red-50' : 'bg-gray-50'}`}
                          style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                        />
                      ) : null,
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className="absolute top-1.5 flex items-center truncate rounded px-2 text-[11px] font-medium text-white shadow-sm"
                      style={{ left, width, height: ROW_HEIGHT - 12, backgroundColor: task.status.color }}
                      title={task.name}
                    >
                      {task.name}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {undated.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            No dates set ({undated.length})
          </h2>
          <div className="flex flex-col gap-1.5">
            {undated.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedTaskId(task.id)}
                className="rounded border border-gray-200 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {task.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedTask && (
        <TaskDetailPanel
          key={selectedTask.id}
          token={token}
          workspaceId={workspaceId}
          spaceId={spaceId}
          listId={listId}
          task={selectedTask}
          statuses={list?.statuses ?? []}
          customFields={customFields}
          members={members}
          onClose={() => setSelectedTaskId(null)}
          onPatch={patchTask}
        />
      )}
    </main>
  );
}
