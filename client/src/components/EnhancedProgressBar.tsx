import { useEffect, useState } from "react";

interface EnhancedProgressBarProps {
  progress: number;
}

export function EnhancedProgressBar({ progress }: EnhancedProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Reset to 0 when progress changes
    setDisplayProgress(0);
    
    // Animate from 0 to target progress
    const duration = 1000; // 1 second
    const steps = 60; // 60 fps
    const increment = progress / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayProgress(progress);
        clearInterval(timer);
      } else {
        setDisplayProgress(Math.min(Math.round(increment * currentStep), progress));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [progress]);

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
          className="font-bold text-lg tabular-nums"
          style={{ color: colors.text }}
        >
          {displayProgress}%
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
