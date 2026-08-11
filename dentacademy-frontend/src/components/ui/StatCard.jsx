export default function StatCard({ icon: Icon, label, value, tone = 'brand', hint }) {
  const tones = {
    brand: 'bg-brand-light text-brand',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-amber-50 text-amber-600',
    gray: 'bg-slate-100 text-slate-600',
  };

  const valueColors = {
    brand: 'text-gray-800',
    red: 'text-red-600',
    yellow: 'text-amber-600',
    gray: 'text-gray-800',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-start gap-4">
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wider">
          {label}
        </h2>
        <p className={`text-3xl font-bold mt-1 ${valueColors[tone]}`}>{value}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
