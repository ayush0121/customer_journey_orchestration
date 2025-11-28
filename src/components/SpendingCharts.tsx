import React, { useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { AlertTriangle, Repeat, Calendar } from 'lucide-react';


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const SpendingCharts: React.FC = () => {
    const { transactions, anomalies, fetchAnomalies } = useStore();

    useEffect(() => {
        if (transactions.length > 0) {
            fetchAnomalies();
        }
    }, [transactions]);

    const categoryData = useMemo(() => {
        const data: Record<string, number> = {};
        transactions.forEach(t => {
            data[t.category] = (data[t.category] || 0) + t.amount;
        });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [transactions]);

    const monthlyData = useMemo(() => {
        const data: Record<string, { Income: number; Expense: number }> = {};

        transactions.forEach(t => {
            const date = new Date(t.date);
            const month = date.toLocaleString('default', { month: 'short' });

            if (!data[month]) {
                data[month] = { Income: 0, Expense: 0 };
            }

            if (t.type === 'income') {
                data[month].Income += t.amount;
            } else {
                data[month].Expense += t.amount;
            }
        });

        // Ensure chronological order if needed, or just return as is
        // For simplicity, we'll just return the entries we have
        return Object.entries(data).map(([name, values]) => ({
            name,
            Income: values.Income,
            Expense: values.Expense
        }));
    }, [transactions]);

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500 text-center">
                <div className="p-4 bg-muted rounded-full">
                    <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">No Data Available</h2>
                <p className="text-muted-foreground max-w-sm">
                    Upload a bank statement in the Data Ingestion tab to visualize your spending habits.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Spending Analysis</h2>
                <p className="text-muted-foreground mt-2">Visualize your cash flow and detect anomalies.</p>
            </div>

            {/* Anomalies & Patterns */}
            <div className="grid gap-4">
                {anomalies.map((anomaly, idx) => (
                    <div key={idx} className={`border rounded-lg p-4 flex items-center gap-3 ${anomaly.type === 'recurring' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300' :
                            anomaly.type === 'seasonality' ? 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300' :
                                'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-300'
                        }`}>
                        {anomaly.type === 'recurring' ? <Repeat className="w-5 h-5 shrink-0" /> :
                            anomaly.type === 'seasonality' ? <Calendar className="w-5 h-5 shrink-0" /> :
                                <AlertTriangle className="w-5 h-5 shrink-0" />}

                        <div>
                            <span className="font-medium block">{anomaly.description}</span>
                            <span className="text-xs opacity-80 uppercase tracking-wider">{anomaly.type} • {anomaly.severity}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Category Distribution */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Spending by Category</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => `$${value.toFixed(2)}`}
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Trends */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Monthly Trends</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Bar dataKey="Income" fill="#4ade80" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
