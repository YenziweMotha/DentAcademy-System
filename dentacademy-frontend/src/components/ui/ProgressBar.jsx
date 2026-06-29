export default function ProgressBar({ progress, color = 'blue' }) {
  const bgColors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-500'
  };
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div className={`${bgColors[color]} h-2.5 rounded-full`} style={{ width: `${progress}%` }}></div>
    </div>
  );
}
