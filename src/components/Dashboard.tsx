import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { FinancialInsight } from '../types';
import { TransactionList } from './TransactionList';
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, PiggyBank, DollarSign, Activity, TrendingUp, Calendar, Download, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, format, eachMonthOfInterval, isSameMonth, compareDesc, min, max } from 'date-fns';
import clsx from 'clsx';
import { generatePDFReport } from '../utils/reportGenerator';

interface DashboardProps {
    onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { transactions, goals, closingBalance } = useStore();
    const [insight, setInsight] = React.useState<FinancialInsight | null>(null);
    const [categoryView, setCategoryView] = useState<'current' | 'all'>('current');
    const [selectedMonthStr, setSelectedMonthStr] = useState<string>('all');

    // --- Dynamic Date Logic ---

    // 1. Get all unique months from transactions
    const availableMonths = useMemo(() => {
        if (transactions.length === 0) return [];
        const months = new Set<string>();
        transactions.forEach(t => {
            try {
                const date = parseISO(t.date);
                months.add(format(startOfMonth(date), 'yyyy-MM-dd'));
            } catch (e) {
                console.error("Invalid date:", t.date);
            }
        });
        // Sort descending (newest first)
        return Array.from(months).sort((a, b) => compareDesc(parseISO(a), parseISO(b)));
    }, [transactions]);

    // 2. Determine date ranges based on selection
    const { currentMonthStart, currentMonthEnd, prevMonthStart, prevMonthEnd } = useMemo(() => {
        if (transactions.length === 0) {
            const now = new Date();
            return { currentMonthStart: now, currentMonthEnd: now, prevMonthStart: now, prevMonthEnd: now };
        }

        if (selectedMonthStr === 'all') {
            const dates = transactions.map(t => parseISO(t.date));
            const minDate = min(dates);
            const maxDate = max(dates);
            return {
                currentMonthStart: startOfMonth(minDate),
                currentMonthEnd: endOfMonth(maxDate),
                prevMonthStart: subMonths(minDate, 1), // Dummy for 'all'
                prevMonthEnd: subMonths(minDate, 1)    // Dummy for 'all'
            };
        } else {
            const date = parseISO(selectedMonthStr);
            return {
                currentMonthStart: startOfMonth(date),
                currentMonthEnd: endOfMonth(date),
                prevMonthStart: startOfMonth(subMonths(date, 1)),
                prevMonthEnd: endOfMonth(subMonths(date, 1))
            };
        }
    }, [selectedMonthStr, transactions]);

    React.useEffect(() => {
        const fetchInsight = async () => {
            if (transactions.length > 0 && goals.length > 0) {
                try {
                    const response = await fetch('http://localhost:8000/insight', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ transactions, goals })
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

    // --- Metrics Calculation ---
    const getTotalsForPeriod = (start: Date, end: Date) => {
        const periodTransactions = transactions.filter(t => {
            try {
                const date = parseISO(t.date);
                return isWithinInterval(date, { start, end });
            } catch (e) {
                return false;
            }
        });

        const income = periodTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = periodTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return { income, expenses };
    };

    const currentMonth = getTotalsForPeriod(currentMonthStart, currentMonthEnd);
    const prevMonth = getTotalsForPeriod(prevMonthStart, prevMonthEnd);

    const calculateChange = (current: number, previous: number) => {
        if (selectedMonthStr === 'all') return 0; // No meaningful change for 'All Time'
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const incomeChange = calculateChange(currentMonth.income, prevMonth.income);
    const expenseChange = calculateChange(currentMonth.expenses, prevMonth.expenses);

    // Balance calculation
    const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

    // Use explicit closing balance if available, otherwise calculate
    const currentBalance = closingBalance !== undefined
        ? closingBalance
        : (totalIncome - totalSpent);

    // For balance trend, we use Net Flow (Income - Expenses) change
    const currentNet = currentMonth.income - currentMonth.expenses;
    const prevNet = prevMonth.income - prevMonth.expenses;
    const balanceChange = calculateChange(currentNet, prevNet);

    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

    // Savings trend (mocked based on 'Savings' category or just placeholder if no data)
    const getSavingsForPeriod = (start: Date, end: Date) => {
        return transactions
            .filter(t => {
                try {
                    const date = parseISO(t.date);
                    return isWithinInterval(date, { start, end }) && (t.category === 'Savings' || t.category === 'Investments');
                } catch (e) { return false; }
            })
            .reduce((sum, t) => sum + t.amount, 0);
    };
    const currentSavings = getSavingsForPeriod(currentMonthStart, currentMonthEnd);
    const prevSavings = getSavingsForPeriod(prevMonthStart, prevMonthEnd);
    const savingsChange = calculateChange(currentSavings, prevSavings);


    const cards = [
        {
            title: selectedMonthStr === 'all' ? 'Total Balance' : 'Balance (Period)',
            value: selectedMonthStr === 'all' ? currentBalance : (currentMonth.income - currentMonth.expenses),
            change: selectedMonthStr === 'all' ? 'All Time' : `${balanceChange > 0 ? '+' : ''}${balanceChange.toFixed(1)}%`,
            trend: balanceChange >= 0 ? 'up' : 'down',
            icon: Wallet,
            color: 'text-blue-600',
            bg: 'bg-blue-100'
        },
        {
            title: selectedMonthStr === 'all' ? 'Total Income' : 'Monthly Income',
            value: currentMonth.income,
            change: selectedMonthStr === 'all' ? 'All Time' : `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(1)}%`,
            trend: incomeChange >= 0 ? 'up' : 'down',
            icon: DollarSign,
            color: 'text-green-600',
            bg: 'bg-green-100'
        },
        {
            title: selectedMonthStr === 'all' ? 'Total Expenses' : 'Monthly Expenses',
            value: currentMonth.expenses,
            change: selectedMonthStr === 'all' ? 'All Time' : `${expenseChange > 0 ? '+' : ''}${expenseChange.toFixed(1)}%`,
            trend: expenseChange > 0 ? 'down' : 'up', // Increase in expense is "down" trend visually (red)
            icon: CreditCard,
            color: 'text-red-600',
            bg: 'bg-red-100'
        },
        {
            title: 'Total Savings',
            value: totalSaved,
            change: selectedMonthStr === 'all' ? 'All Time' : `${savingsChange > 0 ? '+' : ''}${savingsChange.toFixed(1)}%`,
            trend: savingsChange >= 0 ? 'up' : 'down',
            icon: PiggyBank,
            color: 'text-purple-600',
            bg: 'bg-purple-100'
        }
    ];

    // --- Chart Data Preparation ---

    // 1. Category Data (Toggleable)
    const categoryData = useMemo(() => {
        const data: Record<string, number> = {};
        transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                if (categoryView === 'current' && selectedMonthStr !== 'all') {
                    try {
                        return isSameMonth(parseISO(t.date), parseISO(selectedMonthStr));
                    } catch { return false; }
                }
                // If 'all' selected or view is 'all', show everything
                return true;
            })
            .forEach(t => {
                const cat = t.category || 'Other';
                data[cat] = (data[cat] || 0) + t.amount;
            });

        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions, categoryView, selectedMonthStr]);

    // 2. Monthly Trend Data
    const trendData = useMemo(() => {
        if (transactions.length === 0) return [];

        let start: Date, end: Date;

        if (selectedMonthStr === 'all') {
            const dates = transactions.map(t => parseISO(t.date));
            start = startOfMonth(min(dates));
            end = endOfMonth(max(dates));
        } else {
            const date = parseISO(selectedMonthStr);
            end = date;
            start = subMonths(date, 5); // Last 6 months
        }

        const months = eachMonthOfInterval({ start, end });

        return months.map(month => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);

            const totals = getTotalsForPeriod(monthStart, monthEnd);
            return {
                name: format(month, 'MMM yyyy'),
                Income: totals.income,
                Expenses: totals.expenses
            };
        });
    }, [transactions, selectedMonthStr]);

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground mt-2">
                        Overview for <span className="font-semibold text-foreground">
                            {selectedMonthStr === 'all' ? 'All Time' : format(parseISO(selectedMonthStr), 'MMMM yyyy')}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Month Selector */}
                    <div className="relative">
                        <select
                            value={selectedMonthStr}
                            onChange={(e) => setSelectedMonthStr(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 bg-background border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                            <option value="all">All Time</option>
                            {availableMonths.map(monthStr => (
                                <option key={monthStr} value={monthStr}>
                                    {format(parseISO(monthStr), 'MMMM yyyy')}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        <Calendar className="w-4 h-4" />
                        <span>
                            {selectedMonthStr === 'all'
                                ? 'Consolidated View'
                                : `Data up to ${format(endOfMonth(parseISO(selectedMonthStr)), 'MMM d, yyyy')}`}
                        </span>
                    </div>
                    <button
                        onClick={() => generatePDFReport(transactions, goals)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Download Report
                    </button>
                </div>
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
                                {card.trend === 'up' && selectedMonthStr !== 'all' ? <ArrowUpRight className="w-3 h-3 mr-1" /> :
                                    card.trend === 'down' && selectedMonthStr !== 'all' ? <ArrowDownRight className="w-3 h-3 mr-1" /> : null}
                                {card.change}
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
                        <div className="mt-2 text-2xl font-bold">${card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                ))}
            </div>

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

            {/* Charts Section */}
            <div className="grid md:grid-cols-2 gap-8">

                {/* Monthly Trend Chart */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold">Income vs Expenses ({selectedMonthStr === 'all' ? 'All Time' : 'Last 6 Months'})</h3>
                    </div>
                    <div className="h-[300px] w-full min-h-[300px]">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number) => [`$${value.toFixed(0)}`, '']}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="Income" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="Expenses" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No trend data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Spending by Category Chart */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold">Spending by Category</h3>
                        <div className="flex bg-muted rounded-lg p-1">
                            <button
                                onClick={() => setCategoryView('current')}
                                className={clsx(
                                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                    categoryView === 'current' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {selectedMonthStr === 'all' ? 'All Time' : 'Current Month'}
                            </button>
                            <button
                                onClick={() => setCategoryView('all')}
                                className={clsx(
                                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                    categoryView === 'all' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                All Time
                            </button>
                        </div>
                    </div>
                    <div className="h-[300px] w-full min-h-[300px]">
                        {categoryData.length > 0 ? (
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
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No category data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Transactions List */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Recent Transactions ({selectedMonthStr === 'all' ? 'All Time' : format(parseISO(selectedMonthStr), 'MMMM yyyy')})</h3>
                <div className="space-y-4">
                    {transactions
                        .filter(t => selectedMonthStr === 'all' || isSameMonth(parseISO(t.date), parseISO(selectedMonthStr)))
                        .slice(0, 5)
                        .map((t) => (
                            <div key={t.id} className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                        {t.merchant?.[0] || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{t.merchant || 'Unknown Merchant'}</p>
                                        <p className="text-xs text-muted-foreground">{t.date} • {t.category}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold">-${t.amount.toFixed(2)}</span>
                            </div>
                        ))}
                </div>
            </div>

            {/* Transaction Record */}
            <TransactionList />
        </div>
    );
};