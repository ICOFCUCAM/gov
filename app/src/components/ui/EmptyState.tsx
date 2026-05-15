export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-10 px-4 border border-dashed border-line rounded-md">
      <p className="font-medium">{title}</p>
      {hint ? <p className="text-sm text-ink-muted mt-1">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
