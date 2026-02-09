"use client";

import React from 'react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';

export interface ChartDataPoint {
    name: string;
    value: number;
    [key: string]: any;
}

export interface ChartConfig {
    type: 'bar' | 'line' | 'pie' | 'area';
    title: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    data: ChartDataPoint[];
    description?: string;
}

interface ChartRendererProps {
    config: ChartConfig;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const ChartRenderer: React.FC<ChartRendererProps> = ({ config }) => {
    const { type, data, title, xAxisLabel, yAxisLabel, description } = config;

    const renderChart = () => {
        switch (type) {
            case 'bar':
                return (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            tick={{ fill: '#cbd5e1', fontSize: 12 }}
                            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: '#cbd5e1' } : undefined}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            tick={{ fill: '#cbd5e1', fontSize: 12 }}
                            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#cbd5e1' } : undefined}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#f1f5f9'
                            }}
                            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                        />
                        <Legend
                            wrapperStyle={{ color: '#cbd5e1' }}
                            iconType="circle"
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            tick={{ fill: '#cbd5e1', fontSize: 12 }}
                            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: '#cbd5e1' } : undefined}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            tick={{ fill: '#cbd5e1', fontSize: 12 }}
                            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#cbd5e1' } : undefined}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#f1f5f9'
                            }}
                        />
                        <Legend
                            wrapperStyle={{ color: '#cbd5e1' }}
                            iconType="line"
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#1e40af' }}
                            activeDot={{ r: 7, fill: '#60a5fa' }}
                        />
                    </LineChart>
                );
            case 'area':
                return (
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            tick={{ fill: '#cbd5e1', fontSize: 12 }}
                            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: '#cbd5e1' } : undefined}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            tick={{ fill: '#cbd5e1', fontSize: 12 }}
                            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#cbd5e1' } : undefined}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#f1f5f9'
                            }}
                        />
                        <Legend
                            wrapperStyle={{ color: '#cbd5e1' }}
                            iconType="rect"
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="#3b82f6"
                            fillOpacity={0.3}
                        />
                    </AreaChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#f1f5f9'
                            }}
                        />
                        <Legend
                            wrapperStyle={{ color: '#cbd5e1' }}
                            iconType="circle"
                        />
                    </PieChart>
                );
            default:
                return <div className="text-slate-400">Unsupported chart type</div>;
        }
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg my-4 w-full backdrop-blur-sm">
            <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-4 text-center">{title}</h3>
            <div className="h-64 sm:h-72 md:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
            {description && (
                <p className="text-xs sm:text-sm text-slate-400 mt-4 text-center italic border-t border-slate-700/50 pt-3">
                    {description}
                </p>
            )}
        </div>
    );
};

export default ChartRenderer;
