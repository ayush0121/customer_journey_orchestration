import type { Transaction, Budget, Goal } from '../types';

// --- Data Cleaning Logic ---

const CATEGORY_RULES: Record<string, string[]> = {
    'Groceries': ['WHOLEFDS', 'TRADER JOES', 'SAFEWAY', 'KROGER', 'MARKET'],
    'Transport': ['UBER', 'LYFT', 'SHELL', 'CHEVRON', 'BP', 'EXXON'],
    'Entertainment': ['NETFLIX', 'SPOTIFY', 'HULU', 'DISNEY', 'CINEMA', 'TICKET'],
    'Dining': ['STARBUCKS', 'MCDONALDS', 'BURGER', 'RESTAURANT', 'CAFE', 'DOORDASH'],
    'Shopping': ['AMZN', 'AMAZON', 'TARGET', 'WALMART', 'APPLE', 'NIKE']
};

export const cleanTransactions = (rawLines: string[]): Transaction[] => {
    return rawLines.map((line, index) => {
        let merchant = line;
        let category = 'Uncategorized';
        let isRecurring = false;

        // Normalize Merchant Name & Category
        for (const [cat, keywords] of Object.entries(CATEGORY_RULES)) {
            for (const keyword of keywords) {
                if (line.toUpperCase().includes(keyword)) {
                    category = cat;
                    // Simple normalization: Title Case the keyword or use a mapping
                    if (keyword === 'AMZN' || keyword === 'AMAZON') merchant = 'Amazon';
                    else if (keyword === 'WHOLEFDS') merchant = 'Whole Foods';
                    else if (keyword === 'NETFLIX') merchant = 'Netflix';
                    else if (keyword === 'UBER') merchant = 'Uber';
                    else merchant = line.split(/[*0-9]/)[0].trim(); // Basic cleanup
                    break;
                }
            }
        }

        // Detect Recurring
        if (['NETFLIX', 'SPOTIFY', 'HULU', 'GYM'].some(k => line.toUpperCase().includes(k))) {
            isRecurring = true;
        }

        return {
            id: `new_${index}_${Date.now()}`,
            date: new Date().toISOString().split('T')[0], // Today
            merchant: merchant,
            amount: Math.floor(Math.random() * 100) + 10, // Random amount for demo
            category: category,
            type: 'expense', // Default to expense for sample data
            isRecurring: isRecurring,
            originalDescription: line
        };
    });
};

// --- Anomaly Detection ---

export const detectAnomalies = (_transactions: Transaction[]) => {
    const anomalies: string[] = [];

    // Example: Check for high utility bills or weekend spending spikes
    // For this demo, we'll just return hardcoded insights based on the mock data
    // In a real app, this would analyze the `transactions` array.

    anomalies.push("Weekend Alert: You spend 35% more on Saturdays.");
    anomalies.push("Anomaly: Your utility bill is 2x the seasonal average.");

    return anomalies;
};

// --- Chatbot Logic (The "Brain") ---

export const processUserQuery = (
    query: string,
    transactions: Transaction[],
    budgets: Budget[],
    _goals: Goal[]
): string => {
    const lowerQuery = query.toLowerCase();

    // 1. Spending Queries
    if (lowerQuery.includes('spend') || lowerQuery.includes('cost')) {
        // Extract category
        const category = budgets.find(b => lowerQuery.includes(b.category.toLowerCase()));
        if (category) {
            const total = transactions
                .filter(t => t.category === category.category)
                .reduce((sum, t) => sum + t.amount, 0);
            return `You have spent $${total.toFixed(2)} on ${category.category} so far.`;
        }
        return "I can track your spending. Try asking 'How much did I spend on Groceries?'";
    }

    // 2. Forecasting / Affordability
    if (lowerQuery.includes('afford')) {
        // Mock logic: Check "projected" balance
        if (lowerQuery.includes('ps5') || lowerQuery.includes('vacation')) {
            return "Based on your current savings rate, you can afford this in about 3 months. Your projected balance will be $1,200 higher by then.";
        }
        return "I can help you forecast. Tell me what you want to buy.";
    }

    // 3. Reallocation (Agentic)
    if (lowerQuery.includes('over budget') || lowerQuery.includes('need more money')) {
        // Find surplus
        const surplusBudget = budgets.find(b => b.limit - b.spent > 100);
        if (surplusBudget) {
            return `You have $${(surplusBudget.limit - surplusBudget.spent).toFixed(0)} remaining in your ${surplusBudget.category} budget. Shall I move $50 to the category you're worried about?`;
        }
        return "You are tight on all budgets. Consider reducing discretionary spending.";
    }

    // 4. General
    if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
        return "Hello! I'm here to help you manage your finances. Ask me anything!";
    }

    return "I'm not sure about that. Try asking about your spending, goals, or budget adjustments.";
};
