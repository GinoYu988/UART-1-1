import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isActive?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isActive = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  // 2025 Trend: Pill shapes (rounded-full), solid colors, less borders
  const variants = {
    primary: "bg-zinc-800 hover:bg-zinc-700 text-white rounded-full hover:shadow-lg hover:shadow-zinc-900/50",
    secondary: "bg-transparent text-zinc-400 hover:text-white border border-dashed border-zinc-700 hover:border-zinc-500 rounded-full",
    ghost: "bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 rounded-full",
    // Accent: Red for primary actions, White text
    accent: "bg-cine-accent text-white font-bold hover:brightness-110 shadow-lg shadow-cine-accent/20 rounded-full",
    icon: "bg-transparent text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
  };

  const activeStyles = isActive ? "bg-white text-black shadow-md transform scale-[0.98]" : "";
  
  const sizes = {
    sm: "text-xs px-4 py-1.5",
    md: "text-sm px-5 py-2.5",
    lg: "text-base px-8 py-3.5",
    icon: "p-2"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${activeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};