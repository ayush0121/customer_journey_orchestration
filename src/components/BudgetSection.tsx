import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { PieChart, Check, Sparkles, Wallet, Pencil, X } from 'lucide-react';
import clsx from 'clsx';

export const BudgetSection: React.FC = () => {
    const { transactions, budgets, setBudgets } = useStore();
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState<string>('');


    useEffect(() => {
        if (transactions.length > 0 && budgets.length === 0) {
            fetchSuggestions();
        }
    }, [transactions]);

    const fetchSuggestions = async () => {
        try {
            const response = await fetch('http://localhost:8000/budget-suggestion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactions
                })
            });
            if (response.ok) {
                const data = await response.json();
                setSuggestions(data.suggestions);
            }
        } catch (error) {
            console.error("Failed to fetch budget suggestions", error);
        }
    };

    const applyBudget = (suggestion: any) => {
        const newBudget = {
            category: suggestion.category,
            limit: suggestion.suggested_limit,
            spent: transactions
                .filter(t => t.category === suggestion.category)
                .reduce((sum, t) => sum + t.amount, 0)
        };

        // Check if budget already exists
        const exists = budgets.find(b => b.category === newBudget.category);
        if (!exists) {
            setBudgets([...budgets, newBudget]);
        }

        // Remove from suggestions
        setSuggestions(suggestions.filter(s => s.category !== suggestion.category));
    };

    const startEditing = (category: string, currentLimit: number) => {
        setEditingCategory(category);
        setEditAmount(currentLimit.toString());
    };

    const cancelEditing = () => {
        setEditingCategory(null);
        setEditAmount('');
    };

    const saveBudget = (category: string) => {
        const limit = parseFloat(editAmount);
        if (isNaN(limit) || limit <= 0) return;

        const spent = transactions
            .filter(t => t.category === category)
            .reduce((sum, t) => sum + t.amount, 0);

        const newBudget = { category, limit, spent };

        // Update existing or add new
        const existingIdx = budgets.findIndex(b => b.category === category);
        if (existingIdx >= 0) {
            const updated = [...budgets];
            updated[existingIdx] = newBudget;
            setBudgets(updated);
        } else {
            setBudgets([...budgets, newBudget]);
        }

        setEditingCategory(null);
        setEditAmount('');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Smart Budgeting</h2>
                <p className="text-muted-foreground mt-2">AI-powered budget recommendations based on your spending habits.</p>
            </div>

            {/* Suggestions Area */}
            {suggestions.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="font-semibold">AI Recommendations</h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suggestions.map((s, idx) => (
                            <div key={idx} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900 rounded-xl p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="font-bold text-lg">{s.category}</span>
                                    <span className="text-xs font-medium px-2 py-1 bg-white dark:bg-black/20 rounded-full border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400">
                                        Limit: ${s.suggested_limit}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">{s.reason}</p>
                                <button
                                    onClick={() => applyBudget(s)}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Apply Budget
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Budgets & Spending Overview */}
            <div className="space-y-4">
                <h3 className="font-semibold text-xl">Budget Overview</h3>
                {transactions.length === 0 ? (
                    <div className="text-center p-12 border-2 border-dashed border-border rounded-xl">
                        <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No transactions found. Upload data to see your spending breakdown.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {Array.from(new Set(transactions.map(t => t.category)))
                            .filter(cat => {
                                // Only show categories that have at least one expense transaction
                                return transactions.some(t => t.category === cat && t.type === 'expense');
                            })
                            .map((category, idx) => {
                                const budget = budgets.find(b => b.category === category);
                                const spent = transactions
                                    .filter(t => t.category === category)
                                    .reduce((sum, t) => sum + t.amount, 0);

                                // Find suggestion if available
                                const suggestion = suggestions.find(s => s.category === category);

                                if (budget) {
                                    const percent = Math.min((spent / budget.limit) * 100, 100);
                                    const isOver = spent > budget.limit;

                                    return (
                                        <div key={idx} className="bg-card border border-border rounded-xl p-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-muted rounded-lg">
                                                        <PieChart className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold">{category}</h4>
                                                        {editingCategory === category ? (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <input
                                                                    type="number"
                                                                    value={editAmount}
                                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                                    className="w-24 px-2 py-1 text-sm border border-input rounded bg-background"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => saveBudget(category)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={cancelEditing} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs text-muted-foreground">
                                                                    ${spent.toFixed(0)} spent of ${budget.limit} limit
                                                                </p>
                                                                <button
                                                                    onClick={() => startEditing(category, budget.limit)}
                                                                    className="p-0.5 text-muted-foreground hover:text-primary transition-colors"
                                                                >
                                                                    <Pencil className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={clsx(
                                                    "text-sm font-bold",
                                                    isOver ? "text-red-500" : "text-green-500"
                                                )}>
                                                    {percent.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={clsx(
                                                        "h-full transition-all duration-500",
                                                        isOver ? "bg-red-500" : "bg-green-500"
                                                    )}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // No budget set
                                    return (
                                        <div key={idx} className="bg-card border border-border border-dashed rounded-xl p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-muted/50 rounded-lg">
                                                    <Wallet className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-muted-foreground">{category}</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        ${spent.toFixed(0)} spent (No budget set)
                                                    </p>
                                                </div>
                                            </div>

                                            {editingCategory === category ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={editAmount}
                                                        onChange={(e) => setEditAmount(e.target.value)}
                                                        className="w-24 px-2 py-1 text-sm border border-input rounded bg-background"
                                                        placeholder="Limit"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveBudget(category)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={cancelEditing} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {suggestion && (
                                                        <button
                                                            onClick={() => applyBudget(suggestion)}
                                                            className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-md hover:bg-indigo-200 transition-colors flex items-center gap-1"
                                                            title={`AI Recommended: $${suggestion.suggested_limit}`}
                                                        >
                                                            <Sparkles className="w-3 h-3" />
                                                            ${suggestion.suggested_limit}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => startEditing(category, Math.ceil(spent * 0.9))}
                                                        className="px-3 py-1.5 border border-border text-muted-foreground text-xs font-medium rounded-md hover:bg-muted transition-colors"
                                                    >
                                                        Set Limit
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            })}
                    </div>
                )}
            </div>
        </div>
    );
};
