'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronDown, Folder, LayoutGrid, Ship } from 'lucide-react';
import { ListItem, Space } from '@/lib/api';

export interface SpaceWithLists extends Space {
  lists: ListItem[];
}

interface SidebarProps {
  workspaceId?: string;
  workspaceName?: string;
  activeSpaceId?: string;
  activeListId?: string;
  spaces: SpaceWithLists[];
  loading: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  workspaceId,
  workspaceName,
  activeSpaceId,
  activeListId,
  spaces,
  loading,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [collapsedSpaces, setCollapsedSpaces] = useState<Record<string, boolean>>({});

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-[width] duration-150 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <Link
        href="/workspaces"
        className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 px-4 text-white hover:text-teal-400"
        title="All workspaces"
      >
        <Ship size={20} className="shrink-0 text-teal-400" />
        {!collapsed && <span className="truncate font-semibold">Shipboard</span>}
      </Link>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {workspaceId && !collapsed && (
          <p className="mb-2 truncate px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {workspaceName || 'Loading…'}
          </p>
        )}

        {workspaceId && loading && !collapsed && (
          <div className="space-y-2 px-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
          </div>
        )}

        {workspaceId &&
          !loading &&
          spaces.map((space) => {
            const isSpaceCollapsed = collapsedSpaces[space.id];
            const spaceIsActive = space.id === activeSpaceId;
            return (
              <div key={space.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => setCollapsedSpaces((prev) => ({ ...prev, [space.id]: !prev[space.id] }))}
                  className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-slate-800 ${
                    spaceIsActive ? 'text-white' : 'text-slate-300'
                  }`}
                  title={space.name}
                >
                  {!collapsed &&
                    (isSpaceCollapsed ? (
                      <ChevronRight size={14} className="shrink-0 text-slate-500" />
                    ) : (
                      <ChevronDown size={14} className="shrink-0 text-slate-500" />
                    ))}
                  <Folder size={16} className="shrink-0 text-slate-500" />
                  {!collapsed && <span className="truncate">{space.name}</span>}
                </button>

                {!collapsed && !isSpaceCollapsed && (
                  <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-slate-800 pl-3">
                    {space.lists.map((list) => {
                      const listIsActive = list.id === activeListId;
                      return (
                        <Link
                          key={list.id}
                          href={`/workspaces/${workspaceId}/spaces/${space.id}/lists/${list.id}`}
                          className={`flex items-center gap-1.5 truncate rounded-md px-2 py-1 text-sm ${
                            listIsActive
                              ? 'bg-teal-600/20 font-medium text-teal-300'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <LayoutGrid size={13} className="shrink-0" />
                          <span className="truncate">{list.name}</span>
                        </Link>
                      );
                    })}
                    {space.lists.length === 0 && (
                      <p className="px-2 py-1 text-xs text-slate-600">No lists</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex h-11 shrink-0 items-center justify-center border-t border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
