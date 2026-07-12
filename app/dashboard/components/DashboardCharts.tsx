"use client";

import { GlassCard } from "@/app/components/ui/GlassCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ['#fb923c', '#fdba74', '#fed7aa', '#f97316'];

export function DashboardCharts({ stats }: { stats: any }) {
  const data = [
    { name: 'Available', value: stats.assetsAvailable },
    { name: 'Allocated', value: stats.assetsAllocated },
  ];

  return (
    <GlassCard className="h-[300px] flex flex-col">
      <h3 className="text-sm font-semibold mb-4">Asset Distribution</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                color: '#000'
              }} 
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
