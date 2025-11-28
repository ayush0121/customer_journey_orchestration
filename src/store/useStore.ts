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

            apiKey: '',
            apiEndpoint: 'https://pocbfs.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview',
            setApiKey: (key) => set({ apiKey: key }),
            setApiEndpoint: (endpoint) => set({ apiEndpoint: endpoint }),
            setClosingBalance: (balance) => set({ closingBalance: balance }),

            fetchTransactions: async () => {
                try {
                    const response = await fetch('http://localhost:8000/transactions');
                    if (response.ok) {
                        const data = await response.json();
                        const transactions = data.map((t: any) => ({
                            ...t,
                            id: t.id.toString(),
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
                            ...g,
                            id: g.id.toString(),
                            icon: 'Target'
                        }));
                        set({ goals });
                    }
                } catch (error) {
                    console.error("Failed to fetch goals", error);
                }
            },

            fetchAnomalies: async () => {
                const { transactions, apiKey, apiEndpoint } = get();
                if (transactions.length === 0) return;

                try {
                    const response = await fetch('http://localhost:8000/anomalies', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            transactions,
                            api_key: apiKey,
                            api_endpoint: apiEndpoint
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        set({ anomalies: data.anomalies });
                    }
                } catch (error) {
                    console.error("Failed to fetch anomalies", error);
                }
            }
        }),
        {
            name: 'fin-ai-storage',
            partialize: (state) => ({
                apiKey: state.apiKey,
                apiEndpoint: state.apiEndpoint
            }),
        }
    )
);
