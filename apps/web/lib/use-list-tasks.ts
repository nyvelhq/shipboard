'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, CustomField, ListItem, Member, Tag, Task } from './api';
import { getSocket } from './socket';

// Shared by the List and Board views: fetches a List's Tasks + members over
// REST, then joins that List's Socket.IO room. Any client's mutation makes
// the server broadcast "list:changed" to the room; every subscriber
// (including the actor's own tab, for other open tabs) reloads via REST.
// This is an invalidate-and-refetch strategy, not a diff/patch protocol —
// simple to reason about and correct by construction, since reload always
// reflects the database, not a client-side merge.
export function useListTasks(token: string | null, workspaceId: string, spaceId: string, listId: string) {
  const [list, setList] = useState<ListItem | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const [listData, taskData, memberData, fieldData, tagData] = await Promise.all([
        api.getList(token, workspaceId, spaceId, listId),
        api.listTasks(token, workspaceId, spaceId, listId),
        api.listMembers(token, workspaceId),
        api.listCustomFields(token, workspaceId, spaceId, listId),
        api.listTags(token, workspaceId),
      ]);
      setList(listData);
      setTasks(taskData);
      setMembers(memberData);
      setCustomFields(fieldData);
      setTags(tagData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load list.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, workspaceId, spaceId, listId]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    load();

    const socket = getSocket(token);
    socket.emit('list:join', { workspaceId, listId });

    const onChanged = (payload: { listId: string }) => {
      if (payload.listId === listId) load();
    };
    socket.on('list:changed', onChanged);

    return () => {
      socket.emit('list:leave', { listId });
      socket.off('list:changed', onChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, listId]);

  return { list, tasks, members, customFields, tags, loading, error, setError, reload: load };
}
