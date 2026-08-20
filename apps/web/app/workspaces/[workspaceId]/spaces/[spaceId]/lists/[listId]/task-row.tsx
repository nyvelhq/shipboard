'use client';

import { Dispatch, SetStateAction } from 'react';
import { Status, Task, TaskInput } from '@/lib/api';

const PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-gray-100 text-gray-600',
  low: 'bg-blue-100 text-blue-700',
};

interface TaskRowProps {
  task: Task;
  depth: number;
  statuses: Status[];
  expanded: Record<string, boolean>;
  setExpanded: Dispatch<SetStateAction<Record<string, boolean>>>;
  onPatch: (taskId: string, input: TaskInput) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
  onOpenDetail: (task: Task) => void;
  subtaskDraft: Record<string, string>;
  setSubtaskDraft: Dispatch<SetStateAction<Record<string, string>>>;
}

export function TaskRow({
  task,
  depth,
  statuses,
  expanded,
  setExpanded,
  onPatch,
  onDelete,
  onAddSubtask,
  onOpenDetail,
  subtaskDraft,
  setSubtaskDraft,
}: TaskRowProps) {
  const hasSubtasks = (task.subtasks?.length ?? 0) > 0;
  const isExpanded = Boolean(expanded[task.id]);
  const isSubtask = depth > 0;
  const showToggleRow = !isSubtask;

  return (
    <>
      <tr className={`border-t border-gray-100 ${isSubtask ? 'bg-gray-50/60' : ''}`}>
        <td className="w-8 px-3 py-2 align-top">
          {showToggleRow && (hasSubtasks || isExpanded) ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => ({ ...prev, [task.id]: !prev[task.id] }))}
              className="text-gray-400 hover:text-gray-700"
              aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : showToggleRow ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => ({ ...prev, [task.id]: true }))}
              className="text-gray-300 hover:text-gray-600"
              aria-label="Add subtask"
            >
              +
            </button>
          ) : null}
        </td>
        <td className="px-3 py-2" style={{ paddingLeft: isSubtask ? 24 : undefined }}>
          <div className="flex items-center gap-1">
            <input
              key={task.name}
              defaultValue={task.name}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== task.name) onPatch(task.id, { name: value });
              }}
              className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-gray-200 focus:border-teal-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onOpenDetail(task)}
              className="shrink-0 rounded px-1 text-xs text-gray-300 hover:bg-gray-100 hover:text-teal-700"
              title="Open details"
              aria-label="Open task details"
            >
              ⤢
            </button>
          </div>
        </td>
        <td className="px-3 py-2">
          <select
            value={task.statusId}
            onChange={(e) => onPatch(task.id, { statusId: e.target.value })}
            className="rounded border border-gray-200 px-2 py-1 text-xs font-medium"
            style={{ color: task.status.color }}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            value={task.priority}
            onChange={(e) => onPatch(task.id, { priority: e.target.value })}
            className={`rounded px-2 py-1 text-xs font-medium capitalize ${PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.normal}`}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          {task.assignees.length > 0 ? (
            <div className="flex -space-x-1.5">
              {task.assignees.map((a) => (
                <span
                  key={a.userId}
                  title={a.user.name}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[10px] font-semibold text-white ring-2 ring-white"
                >
                  {a.user.name.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-300">Unassigned</span>
          )}
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
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
        </td>
        <td className="px-3 py-2">
          <input
            key={task.dueDate ?? ''}
            type="date"
            defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ''}
            onChange={(e) => e.target.value && onPatch(task.id, { dueDate: e.target.value })}
            className="rounded border border-gray-200 px-2 py-1 text-xs"
          />
        </td>
        <td className="w-8 px-3 py-2 text-right">
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="text-gray-300 hover:text-red-600"
            aria-label="Delete task"
          >
            ✕
          </button>
        </td>
      </tr>

      {showToggleRow && isExpanded && (
        <>
          {task.subtasks?.map((sub) => (
            <TaskRow
              key={sub.id}
              task={sub}
              depth={depth + 1}
              statuses={statuses}
              expanded={expanded}
              setExpanded={setExpanded}
              onPatch={onPatch}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              onOpenDetail={onOpenDetail}
              subtaskDraft={subtaskDraft}
              setSubtaskDraft={setSubtaskDraft}
            />
          ))}
          <tr className="border-t border-gray-100 bg-gray-50/60">
            <td />
            <td className="px-3 py-2" style={{ paddingLeft: 24 }} colSpan={6}>
              <div className="flex max-w-xs gap-2">
                <input
                  value={subtaskDraft[task.id] || ''}
                  onChange={(e) => setSubtaskDraft((prev) => ({ ...prev, [task.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddSubtask(task.id);
                    }
                  }}
                  placeholder="Add subtask"
                  className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
                <button
                  type="button"
                  onClick={() => onAddSubtask(task.id)}
                  className="text-xs font-medium text-teal-700 hover:underline"
                >
                  Add
                </button>
              </div>
            </td>
          </tr>
        </>
      )}
    </>
  );
}
