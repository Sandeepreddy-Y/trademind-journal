import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'indigo' | 'cyan' | 'emerald' | 'rose' | 'none';
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glowColor = 'none',
  hoverable = false,
  onClick
}) => {
  const glowClasses = {
    indigo: 'glow-indigo border-indigo-500/20',
    cyan: 'glow-cyan border-cyan-500/20',
    emerald: 'shadow-emerald-500/5 border-emerald-500/20',
    rose: 'shadow-rose-500/5 border-rose-500/20',
    none: 'border-slate-800/40'
  };

  const baseClass = `glass-panel rounded-3xl p-6 border ${glowClasses[glowColor]} relative overflow-hidden transition-all duration-300 ${
    hoverable ? 'glass-panel-hover hover:-translate-y-1' : ''
  } ${onClick ? 'cursor-pointer' : ''} ${className}`;

  return (
    <div className={baseClass} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;
