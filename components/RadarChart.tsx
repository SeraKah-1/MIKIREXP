import React from 'react';
import { motion } from 'framer-motion';

interface RadarChartProps {
  data: {
    memory: number;
    logic: number;
    focus: number;
    application: number;
  };
}

export const RadarChart: React.FC<RadarChartProps> = ({ data }) => {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const labels = ["Memory", "Logic", "Focus", "Application"];
  const values = [data.memory, data.logic, data.focus, data.application];

  // Calculate polygon points
  const points = values.map((val, i) => {
    const angle = (Math.PI / 2) + (i * 2 * Math.PI) / 4;
    const x = cx + (r * (val / 100)) * Math.cos(angle);
    const y = cy - (r * (val / 100)) * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");

  // Calculate background grid (concentric polygons)
  const gridLevels = [0.25, 0.5, 0.75, 1];
  
  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid Lines */}
        {gridLevels.map((level, idx) => {
           const gridPoints = labels.map((_, i) => {
              const angle = (Math.PI / 2) + (i * 2 * Math.PI) / 4;
              const x = cx + (r * level) * Math.cos(angle);
              const y = cy - (r * level) * Math.sin(angle);
              return `${x},${y}`;
           }).join(" ");
           
           return (
             <polygon 
               key={idx} 
               points={gridPoints} 
               fill="transparent" 
               stroke="#e2e8f0" 
               strokeWidth="1" 
             />
           );
        })}

        {/* Axes */}
        {labels.map((_, i) => {
           const angle = (Math.PI / 2) + (i * 2 * Math.PI) / 4;
           const x = cx + r * Math.cos(angle);
           const y = cy - r * Math.sin(angle);
           return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}

        {/* Data Polygon */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          points={points}
          fill="rgba(99, 102, 241, 0.2)"
          stroke="#6366f1"
          strokeWidth="2"
        />

        {/* Points */}
        {values.map((val, i) => {
           const angle = (Math.PI / 2) + (i * 2 * Math.PI) / 4;
           const x = cx + (r * (val / 100)) * Math.cos(angle);
           const y = cy - (r * (val / 100)) * Math.sin(angle);
           return (
             <motion.circle
               key={i}
               cx={x}
               cy={y}
               r="4"
               fill="#4f46e5"
               initial={{ r: 0 }}
               animate={{ r: 4 }}
               transition={{ delay: 0.5 + i * 0.1 }}
             />
           );
        })}
      </svg>
      
      {/* Labels positioned absolutely */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 text-[10px] font-bold text-slate-500">MEMORY</div>
      <div className="absolute top-1/2 left-0 -translate-x-6 -mt-2 text-[10px] font-bold text-slate-500">APP</div>
      <div className="absolute top-1/2 right-0 translate-x-4 -mt-2 text-[10px] font-bold text-slate-500">LOGIC</div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -mb-4 text-[10px] font-bold text-slate-500">FOCUS</div>
    </div>
  );
};