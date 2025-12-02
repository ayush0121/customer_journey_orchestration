import type { Transaction, Goal, Budget } from '../types';

export const MOCK_TRANSACTIONS: Transaction[] = [
    {
        id: 't1',
        date: '2024-03-01',
        merchant: 'Uber',
        amount: 24.50,
        category: 'Transport',
        type: 'expense',
        isRecurring: false,
        description: 'Uber Ride',
        originalDescription: 'UBER *TRIP 291'
    },
    {
        id: 't2',
        date: '2024-03-02',
        merchant: 'Netflix',
        amount: 15.99,
        category: 'Entertainment',
        type: 'expense',
        isRecurring: true,
        description: 'Netflix Subscription',
        originalDescription: 'NETFLIX.COM PALI'
    },
    {
        id: 't3',
        date: '2024-03-03',
        merchant: 'Whole Foods',
        amount: 142.30,
        category: 'Groceries',
        type: 'expense',
        isRecurring: false,
        description: 'Whole Foods Market',
        originalDescription: 'WHOLEFDS 1234'
    },
    {
        id: 't4',
        date: '2024-03-05',
        merchant: 'Starbucks',
        amount: 6.50,
        category: 'Dining',
        type: 'expense',
        isRecurring: false,
        description: 'Starbucks Coffee',
        originalDescription: 'STARBUCKS STORE 001'
    },
    {
        id: 't5',
        date: '2024-03-05',
        merchant: 'Spotify',
        amount: 9.99,
        category: 'Entertainment',
        type: 'expense',
        isRecurring: true,
        description: 'Spotify Premium',
        originalDescription: 'SPOTIFY USA'
    },
    {
        id: 't6',
        date: '2024-03-10',
        merchant: 'Apple Store',
        amount: 400.00,
        category: 'Shopping',
        type: 'expense',
        isRecurring: false,
        description: 'Apple Store Purchase',
        originalDescription: 'APPLE STORE R023'
    },
    {
        id: 't7',
        date: '2024-03-12',
        merchant: 'Shell',
        amount: 45.00,
        category: 'Transport',
        type: 'expense',
        isRecurring: false,
        description: 'Shell Gas Station',
        originalDescription: 'SHELL OIL 555'
    },
    {
        id: 't8',
        date: '2024-03-15',
        merchant: 'Trader Joes',
        amount: 85.20,
        category: 'Groceries',
        type: 'expense',
        isRecurring: false,
        description: 'Trader Joes Groceries',
        originalDescription: 'TRADER JOES #123'
    },
    {
        id: 't9',
        date: '2024-03-15',
        merchant: 'Tech Corp Inc',
        amount: 3500.00,
        category: 'Income',
        type: 'income',
        isRecurring: true,
        description: 'Salary Payment',
        originalDescription: 'DIRECT DEP TECH CORP'
    }
];

export const RAW_SAMPLE_DATA = [
    "AMZN MKTP US*112",
    "NETFLIX.COM PALI",
    "Shell Oil 1234",
    "UBER *TRIP 888",
    "STARBUCKS 999",
    "TARGET T-1234",
    "Spotify Premium",
    "COMCAST CABLE",
    "DOORDASH*BURGER",
    "Lyft Ride 123"
];

export const MOCK_GOALS: Goal[] = [
    {
        id: 'g1',
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 4500,
        deadline: '2024-12-31',
        icon: 'Shield'
    },
    {
        id: 'g2',
        name: 'Vacation',
        targetAmount: 3000,
        currentAmount: 1200,
        deadline: '2024-08-01',
        icon: 'Plane'
    },
    {
        id: 'g3',
        name: 'New Laptop',
        targetAmount: 2000,
        currentAmount: 500,
        deadline: '2024-06-01',
        icon: 'Laptop'
    }
];

export const MOCK_BUDGETS: Budget[] = [
    { category: 'Groceries', limit: 600, spent: 450 },
    { category: 'Dining', limit: 300, spent: 280 },
    { category: 'Entertainment', limit: 200, spent: 80 }, // Surplus here
    { category: 'Transport', limit: 200, spent: 150 },
    { category: 'Shopping', limit: 500, spent: 400 },
];
