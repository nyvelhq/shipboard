'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Sidebar, SpaceWithLists } from './sidebar';
import { Breadcrumbs, Crumb } from './breadcrumbs';

const VIEW_LABELS: Record<string, string> = {
  board: 'Board',
  sprints: 'Sprints',
  timeline: 'Timeline',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { token, user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ workspaceId?: string; spaceId?: string; listId?: string; sprintId?: string }>();

  const [collapsed, setCollapsed] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [spaces, setSpaces] = useState<SpaceWithLists[]>([]);
  const [navLoading, setNavLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('shipboard_sidebar_collapsed');
    if (stored) setCollapsed(stored === 'true');
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('shipboard_sidebar_collapsed', String(next));
      return next;
    });
  }

  useEffect(() => {
    if (!token || !params.workspaceId) {
      setSpaces([]);
      setWorkspaceName('');
      setNavLoading(false);
      return undefined;
    }
    let cancelled = false;
    setNavLoading(true);
    (async () => {
      try {
        const [workspace, spaceList] = await Promise.all([
          api.getWorkspace(token, params.workspaceId!),
          api.listSpaces(token, params.workspaceId!),
        ]);
        const withLists = await Promise.all(
          spaceList.map(async (space) => ({
            ...space,
            lists: await api.listLists(token, params.workspaceId!, space.id),
          })),
        );
        if (!cancelled) {
          setWorkspaceName(workspace.name);
          setSpaces(withLists);
        }
      } catch {
        // Sidebar nav is a convenience, not the page's own data — a failure
        // here shouldn't block the page itself from rendering.
      } finally {
        if (!cancelled) setNavLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.workspaceId]);

  const crumbs: Crumb[] = useMemo(() => {
    const list: Crumb[] = [{ label: 'Workspaces', href: '/workspaces' }];
    if (!params.workspaceId) return list;

    list.push({ label: workspaceName || '…', href: `/workspaces/${params.workspaceId}` });

    const space = spaces.find((s) => s.id === params.spaceId);
    if (params.spaceId && space) {
      list.push({ label: space.name });
    }

    if (params.listId) {
      const activeList = space?.lists.find((l) => l.id === params.listId);
      list.push({
        label: activeList?.name || '…',
        href: `/workspaces/${params.workspaceId}/spaces/${params.spaceId}/lists/${params.listId}`,
      });

      const segments = pathname.split('/').filter(Boolean);
      const listIndex = segments.indexOf(params.listId);
      const nextSegment = segments[listIndex + 1];
      if (nextSegment && VIEW_LABELS[nextSegment]) {
        list.push({ label: VIEW_LABELS[nextSegment] });
      }
      if (params.sprintId) {
        list.push({ label: 'Sprint' });
      }
    }

    return list;
  }, [params, spaces, workspaceName, pathname]);

  if (!ready || !token) return <>{children}</>;

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        workspaceId={params.workspaceId}
        workspaceName={workspaceName}
        activeSpaceId={params.spaceId}
        activeListId={params.listId}
        spaces={spaces}
        loading={navLoading}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-6">
          <Breadcrumbs crumbs={crumbs} />
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm text-gray-500">{user?.name}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
