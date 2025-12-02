import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { ChevronDown, ChevronRight, Edit2, Check, X, Plus } from 'lucide-react';

const DEFAULT_CATEGORIES = [
    'Subscriptions',
    'Transportation',
    'Travel & Vacations',
    'Credit Card Payments',
    'Income',
    'Others',
    'Groceries',
    'Dining',
    'Shopping',
    'Bills'
];

export const TransactionList: React.FC = () => {
    const { transactions, updateTransactionCategory } = useStore();
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isCustomEntry, setIsCustomEntry] = useState(false);

    // Group transactions by category
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, typeof transactions> = {};
        transactions.forEach(t => {
            const category = t.category || 'Uncategorized';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(t);
        });
        return groups;
    }, [transactions]);

    const toggleCategory = (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const startEditing = (id: string, currentCategory: string) => {
        setEditingId(id);
        setEditValue(currentCategory);
        // If current category is not in default list, default to custom mode
        if (!DEFAULT_CATEGORIES.includes(currentCategory)) {
            setIsCustomEntry(true);
        } else {
            setIsCustomEntry(false);
        }
    };

    const saveCategory = async (id: string) => {
        if (editValue.trim()) {
            await updateTransactionCategory(id, editValue.trim());
        }
        setEditingId(null);
        setIsCustomEntry(false);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValue('');
        setIsCustomEntry(false);
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'CUSTOM_OPTION') {
            setIsCustomEntry(true);
            setEditValue('');
        } else {
            setEditValue(value);
        }
    };

    const categories = Object.keys(groupedTransactions).sort();

    if (transactions.length === 0) {
        return (
            <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/20 text-center text-gray-500">
                No transactions found. Upload a statement to get started.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Transaction Record</h2>
            <div className="bg-white/50 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 overflow-hidden">
                {categories.map(category => (
                    <div key={category} className="border-b border-gray-100 last:border-0">
                        <button
                            onClick={() => toggleCategory(category)}
                            className="w-full flex items-center justify-between p-4 hover:bg-white/60 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {expandedCategories.has(category) ? (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                )}
                                <span className="font-medium text-gray-700">{category}</span>
                                <span className="text-sm text-gray-400">
                                    ({groupedTransactions[category].length})
                                </span>
                            </div>
                            <span className="font-medium text-gray-900">
                                ${groupedTransactions[category].reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                            </span>
                        </button>

                        {expandedCategories.has(category) && (
                            <div className="bg-white/30">
                                {groupedTransactions[category].map(transaction => (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center justify-between p-4 pl-12 border-t border-gray-50 hover:bg-white/50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-800">{transaction.merchant}</span>
                                                <span className="text-xs text-gray-400">{transaction.date}</span>
                                            </div>
                                            <p className="text-sm text-gray-500 truncate max-w-md">
                                                {transaction.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <span className={`font-medium ${transaction.type === 'income' ? 'text-emerald-600' : 'text-gray-900'
                                                }`}>
                                                {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                                            </span>

                                            {editingId === transaction.id ? (
                                                <div className="flex items-center gap-2">
                                                    {isCustomEntry ? (
                                                        <input
                                                            type="text"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            placeholder="Enter custom category"
                                                            className="text-sm border rounded px-2 py-1 w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <select
                                                            value={editValue}
                                                            onChange={handleSelectChange}
                                                            className="text-sm border rounded px-2 py-1 w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                            autoFocus
                                                        >
                                                            {DEFAULT_CATEGORIES.map(cat => (
                                                                <option key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                            <option value="CUSTOM_OPTION" className="font-semibold text-indigo-600">
                                                                + Create Custom...
                                                            </option>
                                                        </select>
                                                    )}

                                                    <button
                                                        onClick={() => saveCategory(transaction.id)}
                                                        className="p-1 hover:bg-emerald-100 rounded text-emerald-600"
                                                        title="Save"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="p-1 hover:bg-red-100 rounded text-red-600"
                                                        title="Cancel"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(transaction.id, transaction.category)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                                                    title="Edit Category"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
