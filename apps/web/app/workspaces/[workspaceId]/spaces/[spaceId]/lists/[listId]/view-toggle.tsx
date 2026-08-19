import Link from 'next/link';

export function ViewToggle({
  workspaceId,
  spaceId,
  listId,
  active,
}: {
  workspaceId: string;
  spaceId: string;
  listId: string;
  active: 'list' | 'board' | 'sprints';
}) {
  const base = `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}`;
  const tabClass = (tab: typeof active) =>
    active === tab
      ? 'rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white'
      : 'rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50';

  return (
    <div className="flex gap-2 text-sm">
      <Link href={base} className={tabClass('list')}>
        List
      </Link>
      <Link href={`${base}/board`} className={tabClass('board')}>
        Board
      </Link>
      <Link href={`${base}/sprints`} className={tabClass('sprints')}>
        Sprints
      </Link>
    </div>
  );
}
