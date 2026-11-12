import React from 'react';

interface DotRatingProps {
  value: number;
  max?: number;
  min?: number;
  onChange?: (val: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  activeColor?: string;
}

export const DotRating: React.FC<DotRatingProps> = ({
  value,
  max = 5,
  min = 0,
  onChange,
  readOnly = false,
  size = 'md',
  activeColor = 'bg-red-600',
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-5.5 h-5.5',
  }[size];

  return (
    <div className="flex items-center space-x-1.5 select-none">
      {Array.from({ length: max }).map((_, index) => {
        const dotIndex = index + 1;
        const isFilled = dotIndex <= value;

        return (
          <button
            key={index}
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (readOnly || !onChange) return;
              if (dotIndex === value) {
                onChange(Math.max(min, value - 1));
              } else {
                onChange(Math.max(min, dotIndex));
              }
            }}
            className={`rounded-full border transition-all duration-150 ${sizeClasses} ${
              isFilled
                ? `${activeColor} border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.7)]`
                : 'bg-slate-900/90 border-slate-700/80 hover:border-indigo-400'
            } ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-120'}`}
            title={`${dotIndex}/${max}`}
          />
        );
      })}
    </div>
  );
};
