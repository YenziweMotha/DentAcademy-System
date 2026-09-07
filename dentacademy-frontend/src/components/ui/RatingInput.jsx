export default function RatingInput({ label, value, onChange, max = 5 }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex space-x-1">
        {[...Array(max)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            className={`w-8 h-8 rounded-full border ${value >= i + 1 ? 'bg-brand border-brand text-white' : 'bg-white border-gray-300 text-gray-400'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
