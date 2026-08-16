/** EmptyState — centered, quiet, with one optional action. */
export interface EmptyStateProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__title">{title}</span>
      {body ? <p className="empty-state__body">{body}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="button button--primary button--inline" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
