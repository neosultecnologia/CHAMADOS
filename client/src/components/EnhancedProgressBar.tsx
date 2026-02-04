interface EnhancedProgressBarProps {
  progress: number;
}

export function EnhancedProgressBar({ progress }: EnhancedProgressBarProps) {
  const getProgressColor = (value: number) => {
    if (value < 30) return { text: "#ef4444", gradient: "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)" };
    if (value < 70) return { text: "#f59e0b", gradient: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)" };
    return { text: "#10b981", gradient: "linear-gradient(90deg, #10b981 0%, #059669 100%)" };
  };

  const colors = getProgressColor(progress);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700 font-medium">Progresso</span>
        <span 
          className="font-bold text-lg"
          style={{ color: colors.text }}
        >
          {progress}%
        </span>
      </div>
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${progress}%`,
            background: colors.gradient
          }}
        />
      </div>
    </div>
  );
}
