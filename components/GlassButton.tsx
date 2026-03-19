
import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  isLoading = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "relative px-6 py-3 rounded-2xl font-medium transition-all duration-300 backdrop-blur-md border shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  
  const variants = {
    primary: "bg-white/40 border-white/50 text-slate-800 hover:bg-white/60 hover:border-white/80 hover:shadow-xl hover:shadow-indigo-500/10",
    secondary: "bg-slate-800/5 border-slate-800/10 text-slate-600 hover:bg-slate-800/10",
    danger: "bg-red-500/10 border-red-500/20 text-red-700 hover:bg-red-500/20"
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
           <RefreshCw className="animate-spin" size={20} />
           <span>Memproses...</span>
        </div>
      ) : children}
    </motion.button>
  );
};
