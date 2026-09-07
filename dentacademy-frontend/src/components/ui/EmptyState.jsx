import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 animate-fade-up">
      <div className="h-14 w-14 rounded-2xl bg-brand-light flex items-center justify-center mb-4">
        <Icon size={26} className="text-brand" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
