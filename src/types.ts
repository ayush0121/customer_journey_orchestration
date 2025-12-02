export interface Transaction {
    id: string;
    date: string;
    merchant: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
    isRecurring: boolean;
    description: string;
    originalDescription: string; // For "dirty" data simulation
}

export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;
    icon: string; // Lucide icon name
}

export interface Budget {
    category: string;
    limit: number;
    spent: number;
}

export interface Anomaly {
    description: string;
    type: 'anomaly' | 'recurring' | 'seasonality';
    severity: 'low' | 'medium' | 'high';
    transaction_id?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    action?: {
        type: 'none' | 'move_budget' | 'create_goal';
        details: any;
    };
}

export interface AppState {
    transactions: Transaction[];
    goals: Goal[];
    budgets: Budget[];
    chatHistory: ChatMessage[];
    isLoading: boolean;
    closingBalance?: number;
    anomalies: Anomaly[];

    // Actions
    addTransaction: (transaction: Transaction) => void;
    addTransactions: (transactions: Transaction[]) => void;
    setTransactions: (transactions: Transaction[]) => void;
    addGoal: (goal: Goal) => void;
    updateGoal: (id: string, updates: Partial<Goal>) => void;
    removeGoal: (id: string) => void;
    setBudgets: (budgets: Budget[]) => void;
    addBudget: (budget: Budget) => void;
    moveBudget: (fromCategory: string, toCategory: string, amount: number) => void;
    addChatMessage: (message: ChatMessage) => void;
    clearChat: () => void;
    setClosingBalance: (balance: number) => void;
    fetchTransactions: () => Promise<void>;
    fetchGoals: () => Promise<void>;
    fetchAnomalies: () => Promise<void>;
    clearData: () => Promise<void>;
    updateTransactionCategory: (id: string, newCategory: string) => Promise<void>;
}

export interface FinancialInsight {
    insight_text: string;
    metric_value: string;
    impacted_goal: string;
    spending_summary: string;
    projected_balance: number;
}
