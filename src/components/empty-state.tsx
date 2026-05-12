import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      data-testid="empty-state"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--od-card-radius)] bg-[var(--od-accent-soft)]">
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-semibold text-[var(--od-text)]">
        {title}
      </h3>
      <p className="mb-4 max-w-sm text-sm text-[var(--od-text-muted)]">
        {description}
      </p>
      {action &&
        (action.href ? (
          <a
            href={action.href}
            className="od-button od-button-primary px-4 py-2"
            data-testid="empty-state-cta"
          >
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="od-button od-button-primary px-4 py-2"
            data-testid="empty-state-cta"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
