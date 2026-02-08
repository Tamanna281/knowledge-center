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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ChartRenderer: React.FC<ChartRendererProps> = ({ config }) => {
    const { type, data, title, xAxisLabel, yAxisLabel, description } = config;

    const renderChart = () => {
        switch (type) {
            case 'bar':
                return (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="name"
                            label={{ value: xAxisLabel, position: 'insideBottom', offset: -5 }}
                            stroke="#94a3b8"
                        />
                        <YAxis
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                            stroke="#94a3b8"
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                color: '#f1f5f9'
                            }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="name"
                            label={{ value: xAxisLabel, position: 'insideBottom', offset: -5 }}
                            stroke="#94a3b8"
                        />
                        <YAxis
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                            stroke="#94a3b8"
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                color: '#f1f5f9'
                            }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                );
            case 'area':
                return (
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="name"
                            label={{ value: xAxisLabel, position: 'insideBottom', offset: -5 }}
                            stroke="#94a3b8"
                        />
                        <YAxis
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                            stroke="#94a3b8"
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                color: '#f1f5f9'
                            }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            fill="#93c5fd"
                            fillOpacity={0.4}
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
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                color: '#f1f5f9'
                            }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                );
            default:
                return <div className="text-slate-400">Unsupported chart type</div>;
        }
    };

    return (
        <div
            className="p-6 rounded-xl border border-white/10 my-4 w-full backdrop-blur-sm"
            style={{ backgroundColor: '#1e293b' }} // explicit slate-800 for PDF safety
        >
            <h3
                className="text-xl font-semibold mb-4 text-center"
                style={{ color: '#34d399' }} // explicit emerald-400
            >
                {title}
            </h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
            {description && (
                <p className="text-sm text-slate-300 mt-4 text-center italic border-t border-white/10 pt-4">
                    {description}
                </p>
            )}
        </div>
    );
};

export default ChartRenderer;
