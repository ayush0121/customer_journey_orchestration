import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from '../types';

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            transactions: [],
            goals: [],
            budgets: [],
            anomalies: [],
            chatHistory: [
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: "Hello! I'm your personal finance assistant. Ask me about your spending, goals, or budget.",
                    timestamp: new Date().toISOString()
                }
            ],
            isLoading: false,

            addTransaction: (transaction) => set((state) => ({
                transactions: [transaction, ...state.transactions]
            })),

            addTransactions: (newTransactions) => set((state) => {
                const existingSignatures = new Set(
                    state.transactions.map(t => `${t.date}-${t.merchant}-${t.amount}`)
                );

                const uniqueNewTransactions = newTransactions.filter(t =>
                    !existingSignatures.has(`${t.date}-${t.merchant}-${t.amount}`)
                );

                return {
                    transactions: [...uniqueNewTransactions, ...state.transactions]
                };
            }),

            setTransactions: (transactions) => set({ transactions }),

            addGoal: (goal) => set((state) => ({
                goals: [...state.goals, goal]
            })),

            updateGoal: (id, updates) => set((state) => ({
                goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g))
            })),

            removeGoal: async (id) => {
                set((state) => ({
                    goals: state.goals.filter((g) => g.id !== id)
                }));
                try {
                    await fetch(`http://localhost:8000/goals/${id}`, { method: 'DELETE' });
                } catch (error) {
                    console.error("Failed to delete goal", error);
                }
            },

            setBudgets: (budgets) => set({ budgets }),

            addBudget: (budget) => set((state) => ({
                budgets: [...state.budgets, budget]
            })),

            moveBudget: (fromCategory, toCategory, amount) => set((state) => {
                const newBudgets = state.budgets.map(b => {
                    if (b.category === fromCategory) {
                        return { ...b, limit: b.limit - amount };
                    }
                    if (b.category === toCategory) {
                        return { ...b, limit: b.limit + amount };
                    }
                    return b;
                });
                return { budgets: newBudgets };
            }),

            addChatMessage: (message) => set((state) => ({
                chatHistory: [...state.chatHistory, message]
            })),

            clearChat: () => set({ chatHistory: [] }),

            setClosingBalance: (balance) => set({ closingBalance: balance }),

            fetchTransactions: async () => {
                try {
                    const response = await fetch('http://localhost:8000/transactions');
                    if (response.ok) {
                        const data = await response.json();
                        // Safe mapping to ensure frontend types are met even if DB has missing fields
                        const transactions = data.map((t: any) => ({
                            ...t,
                            id: t.id.toString(),
                            merchant: t.merchant || t.description || 'Unknown', // Fallback
                            type: t.type || 'expense', // Fallback
                            isRecurring: t.is_recurring || false // Handle snake_case from DB
                        }));
                        set({ transactions });
                    }
                } catch (error) {
                    console.error("Failed to fetch transactions", error);
                }
            },

            fetchGoals: async () => {
                try {
                    const response = await fetch('http://localhost:8000/goals');
                    if (response.ok) {
                        const data = await response.json();
                        const goals = data.map((g: any) => ({
                            id: g.id.toString(),
                            name: g.name,
                            targetAmount: g.target_amount,
                            currentAmount: g.current_amount,
                            deadline: g.deadline,
                            icon: 'Target'
                        }));
                        set({ goals });
                    }
                } catch (error) {
                    console.error("Failed to fetch goals", error);
                }
            },
            fetchAnomalies: async () => {
                const { transactions } = get();
                if (transactions.length === 0) return;

                try {
                    const response = await fetch('http://localhost:8000/anomalies', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            transactions
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        set({ anomalies: data.anomalies });
                    }
                } catch (error) {
                    console.error("Failed to fetch anomalies", error);
                }
            },

            clearData: async () => {
                try {
                    await fetch('http://localhost:8000/transactions', { method: 'DELETE' });
                    set({
                        transactions: [],
                        goals: [],
                        budgets: [],
                        anomalies: [],
                        closingBalance: undefined,
                        chatHistory: [
                            {
                                id: 'welcome',
                                role: 'assistant',
                                content: "Hello! I'm your personal finance assistant. Ask me about your spending, goals, or budget.",
                                timestamp: new Date().toISOString()
                            }
                        ]
                    });
                } catch (error) {
                    console.error("Failed to clear data", error);
                }
            },

            updateTransactionCategory: async (id, newCategory) => {
                // Optimistic update
                set((state) => ({
                    transactions: state.transactions.map(t =>
                        t.id === id ? { ...t, category: newCategory } : t
                    )
                }));

                try {
                    const response = await fetch(`http://localhost:8000/transactions/${id}/category`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ category: newCategory })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update category');
                    }
                } catch (error) {
                    console.error("Failed to update transaction category", error);
                }
            }
        }),
        {
            name: 'fin-ai-storage',
            partialize: () => ({
                // No longer persisting API key/endpoint
            }),
        }
    )
);