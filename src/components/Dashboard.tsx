import React from 'react';
import { useStore } from '../store/useStore';
import type { FinancialInsight } from '../types';
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, PiggyBank, DollarSign, Activity, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';

interface DashboardProps {
    onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { transactions, goals, budgets, closingBalance } = useStore();
    const [insight, setInsight] = React.useState<FinancialInsight | null>(null);

    React.useEffect(() => {
        const fetchInsight = async () => {
            if (transactions.length > 0 && goals.length > 0) {
                try {
                    const response = await fetch('http://localhost:8000/insight', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ transactions, goals, api_key: useStore.getState().apiKey, api_endpoint: useStore.getState().apiEndpoint })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setInsight(data);
                    }
                } catch (error) {
                    console.error("Failed to fetch insight", error);
                }
            }
        };
        fetchInsight();
    }, [transactions, goals]);

    const totalSpent = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

    // Use explicit closing balance if available, otherwise calculate
    const currentBalance = closingBalance !== undefined
        ? closingBalance
        : (totalIncome - totalSpent);

    const cards = [
        {
            title: 'Total Balance',
            value: currentBalance,
            change: '+2.5%',
            trend: 'up',
            icon: Wallet,
            color: 'text-blue-600',
            bg: 'bg-blue-100'
        },
        {
            title: 'Monthly Income',
            value: totalIncome,
            change: '+0.0%',
            trend: 'neutral',
            icon: DollarSign,
            color: 'text-green-600',
            bg: 'bg-green-100'
        },
        {
            title: 'Total Expenses',
            value: totalSpent,
            change: '+12.5%',
            trend: 'down', // High expenses is "down" for financial health
            icon: CreditCard,
            color: 'text-red-600',
            bg: 'bg-red-100'
        },
        {
            title: 'Total Savings',
            value: totalSaved,
            change: '+5.2%',
            trend: 'up',
            icon: PiggyBank,
            color: 'text-purple-600',
            bg: 'bg-purple-100'
        }
    ];

    // Prepare data for charts
    const categoryData = React.useMemo(() => {
        const data: Record<string, number> = {};
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const cat = t.category || 'Other';
                data[cat] = (data[cat] || 0) + t.amount;
            });

        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in duration-500 text-center">
                <div className="p-6 bg-primary/10 rounded-full">
                    <Wallet className="w-12 h-12 text-primary" />
                </div>
                <div className="max-w-md space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Welcome to Your Financial Dashboard</h2>
                    <p className="text-muted-foreground">
                        To get started, please upload your bank statement PDF. We'll analyze your spending and generate insights for you.
                    </p>
                </div>
                <button
                    onClick={() => onNavigate('data')}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                    Go to Data Ingestion <ArrowUpRight className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground mt-2">Welcome back! Here's your financial overview.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <div key={card.title} className="p-6 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={clsx("p-2 rounded-lg", card.bg)}>
                                <card.icon className={clsx("w-5 h-5", card.color)} />
                            </div>
                            <div className={clsx(
                                "flex items-center text-xs font-medium px-2 py-1 rounded-full",
                                card.trend === 'up' ? "bg-green-100 text-green-700" :
                                    card.trend === 'down' ? "bg-red-100 text-red-700" :
                                        "bg-gray-100 text-gray-700"
                            )}>
                                {card.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> :
                                    card.trend === 'down' ? <ArrowDownRight className="w-3 h-3 mr-1" /> : null}
                                {card.change}
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
                        <div className="mt-2 text-2xl font-bold">${card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                ))}
            </div>

            {/* Recent Activity Preview */}
            {/* Insights & Forecasting */}
            {insight && (
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">AI Spending Summary</h3>
                        </div>
                        <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">
                            {insight.spending_summary}
                        </p>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">Projected EOM Balance</h3>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                                ${insight.projected_balance.toLocaleString()}
                            </span>
                            <span className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mb-1">estimated</span>
                        </div>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-2">
                            Based on your current daily spending average.
                        </p>
                    </div>
                </div>
            )}

            {/* Recent Activity & Charts */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* Recent Transactions */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Recent Transactions</h3>
                    <div className="space-y-4">
                        {transactions.slice(0, 4).map((t) => (
                            <div key={t.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                        {t.merchant[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{t.merchant}</p>
                                        <p className="text-xs text-muted-foreground">{t.category}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold">-${t.amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Spending by Category Chart */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="font-semibold mb-6">Spending by Category</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                    {categoryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Budget Status */}
            <div className="bg-gradient-to-br from-primary/5 to-blue-500/5 border border-primary/10 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Wallet className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Budget Status</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    You have spent <strong>${totalSpent.toFixed(0)}</strong> of your <strong>${totalBudget.toFixed(0)}</strong> monthly budget.
                </p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div
                        className="h-full bg-primary transition-all duration-1000"
                        style={{ width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}% used
                </p>
            </div>
        </div>
    );
};
