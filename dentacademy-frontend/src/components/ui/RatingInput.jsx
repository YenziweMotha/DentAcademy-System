export default function RatingInput({ label, value, onChange, max = 5 }) {
  return (
    <div className="mb-1">
      <label className="block text-sm font-medium text-ink mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {[...Array(max)].map((_, i) => {
          const active = value >= i + 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i + 1)}
              className={`w-9 h-9 rounded-xl border text-sm font-semibold transition-all duration-150 focus-ring ${
                active
                  ? 'bg-brand border-brand text-white shadow-sm scale-105'
                  : 'bg-surface-raised border-line text-ink-subtle hover:border-brand/40 hover:text-brand'
              }`}
              aria-pressed={active}
              aria-label={`${label} rating ${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
