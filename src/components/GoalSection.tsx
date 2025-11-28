import React from 'react';
import { useStore } from '../store/useStore';
import { Shield, Plane, Laptop, Plus, Sparkles, ArrowUpRight, Target, Calculator, ArrowRight } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
    'Shield': <Shield className="w-6 h-6" />,
    'Plane': <Plane className="w-6 h-6" />,
    'Laptop': <Laptop className="w-6 h-6" />,
};

export const GoalSection: React.FC = () => {
    const { goals, addGoal, transactions, apiKey, apiEndpoint } = useStore();
    const [isCreating, setIsCreating] = React.useState(false);
    const [newGoal, setNewGoal] = React.useState({
        name: '',
        targetAmount: '',
        deadline: '',
        icon: 'Target'
    });
    const [insight, setInsight] = React.useState<{ insight_text: string; metric_value: string; impacted_goal: string } | null>(null);
    const [loadingInsight, setLoadingInsight] = React.useState(false);

    // What-If State
    const [extraSavings, setExtraSavings] = React.useState(100);
    const [scenario, setScenario] = React.useState<{
        monthly_contribution_increase: number;
        new_deadlines: { goal_name: string; new_date: string; months_saved: number }[];
        impact_description: string;
        trade_off_suggestion: string;
    } | null>(null);
    const [simulating, setSimulating] = React.useState(false);

    const calculateMonthlySavings = (target: number, current: number, deadline: string) => {
        const today = new Date();
        const targetDate = new Date(deadline);
        const months = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
        if (months <= 0) return 0;
        return (target - current) / months;
    };

    const handleAddGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) return;

        const goalData = {
            id: Date.now().toString(),
            name: newGoal.name,
            targetAmount: Number(newGoal.targetAmount),
            currentAmount: 0,
            deadline: newGoal.deadline,
            icon: newGoal.icon
        };

        addGoal(goalData);

        // Persist to backend
        try {
            fetch('http://localhost:8000/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: goalData.name,
                    target_amount: goalData.targetAmount,
                    current_amount: goalData.currentAmount,
                    deadline: goalData.deadline
                })
            });
        } catch (err) {
            console.error("Failed to persist goal", err);
        }

        setIsCreating(false);
        setNewGoal({ name: '', targetAmount: '', deadline: '', icon: 'Target' });
    };

    React.useEffect(() => {
        const fetchInsight = async () => {
            if (transactions.length === 0 || goals.length === 0 || !apiKey) return;

            setLoadingInsight(true);
            try {
                const response = await fetch('http://localhost:8000/insight', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transactions,
                        goals,
                        api_key: apiKey,
                        api_endpoint: apiEndpoint
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    setInsight(data);
                }
            } catch (error) {
                console.error("Failed to fetch insight", error);
            } finally {
                setLoadingInsight(false);
            }
        };

        fetchInsight();
        fetchInsight();
    }, [transactions, goals, apiKey, apiEndpoint]);

    const handleSimulate = async () => {
        if (!apiKey) {
            alert("Please enter your API Key in the Data Ingestion tab first.");
            return;
        }
        setSimulating(true);
        console.log("Starting simulation...");
        try {
            const response = await fetch('http://localhost:8000/what_if', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactions,
                    goals,
                    extra_savings: extraSavings,
                    api_key: apiKey,
                    api_endpoint: apiEndpoint
                })
            });
            console.log("Response status:", response.status);
            if (response.ok) {
                const data = await response.json();
                console.log("Simulation data:", data);
                setScenario(data);
            } else {
                const errorText = await response.text();
                console.error("Simulation failed:", errorText);
            }
        } catch (error) {
            console.error("Simulation error", error);
        } finally {
            setSimulating(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Financial Goals</h2>
                    <p className="text-muted-foreground mt-2">Track your progress and plan for the future.</p>
                </div>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>{isCreating ? 'Cancel' : 'New Goal'}</span>
                </button>
            </div>

            {isCreating && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-in slide-in-from-top-2">
                    <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>
                    <form onSubmit={handleAddGoal} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Goal Name</label>
                            <input
                                type="text"
                                value={newGoal.name}
                                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                                placeholder="e.g. New Car"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Target Amount ($)</label>
                            <input
                                type="number"
                                value={newGoal.targetAmount}
                                onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                                placeholder="5000"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Deadline</label>
                            <input
                                type="date"
                                value={newGoal.deadline}
                                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background"
                                required
                            />
                        </div>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                            Save Goal
                        </button>
                    </form>
                </div>
            )}

            {/* AI Insight Tip */}
            {(insight || loadingInsight) && (
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 flex items-start gap-4">
                    <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">
                            {loadingInsight ? 'Analyzing your finances...' : 'AI Insight'}
                        </h3>
                        {loadingInsight ? (
                            <div className="h-4 w-64 bg-indigo-200/50 dark:bg-indigo-800/50 rounded animate-pulse mt-2" />
                        ) : (
                            <p className="text-sm text-indigo-800/80 dark:text-indigo-200/80 mt-1">
                                {insight?.insight_text}
                                {insight?.impacted_goal && <span> Helps with <strong>{insight.impacted_goal}</strong>.</span>}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* What-If Simulator */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Calculator className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold">What-If Simulator</h3>
                        <p className="text-xs text-muted-foreground">See how extra savings impact your goals</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full md:w-1/3 space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Extra Monthly Savings: <span className="text-primary font-bold">${extraSavings}</span></label>
                            <input
                                type="range"
                                min="50"
                                max="2000"
                                step="50"
                                value={extraSavings}
                                onChange={(e) => setExtraSavings(Number(e.target.value))}
                                className="w-full accent-primary"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>$50</span>
                                <span>$2000</span>
                            </div>
                        </div>
                        <button
                            onClick={handleSimulate}
                            disabled={simulating}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            {simulating ? 'Simulating...' : 'Run Simulation'}
                        </button>
                    </div>

                    {scenario && (
                        <div className="flex-1 bg-muted/30 rounded-lg p-4 animate-in fade-in">
                            <h4 className="font-semibold text-blue-700 mb-2">Impact Analysis</h4>
                            <p className="text-sm mb-3">{scenario.impact_description}</p>

                            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-800 dark:text-yellow-200">
                                <strong>💡 Trade-off:</strong> {scenario.trade_off_suggestion}
                            </div>

                            <div className="space-y-2">
                                {scenario.new_deadlines.map((nd, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0">
                                        <span>{nd.goal_name}</span>
                                        <div className="flex items-center gap-2 text-green-600 font-medium">
                                            <span>{nd.months_saved} months sooner</span>
                                            <ArrowRight className="w-3 h-3" />
                                            <span>{new Date(nd.new_date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl text-center">
                        <div className="p-4 bg-muted rounded-full mb-4">
                            <Target className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Goals Yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                            Set financial goals to track your progress and achieve your dreams.
                        </p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Create Your First Goal
                        </button>
                    </div>
                ) : (
                    goals.map((goal) => {
                        const progress = (goal.currentAmount / goal.targetAmount) * 100;
                        const monthlyNeeded = calculateMonthlySavings(goal.targetAmount, goal.currentAmount, goal.deadline);

                        return (
                            <div key={goal.id} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-muted rounded-xl">
                                        {iconMap[goal.icon] || <Target className="w-6 h-6" />}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Target</p>
                                        <p className="font-bold">${goal.targetAmount.toLocaleString()}</p>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold mb-1">{goal.name}</h3>
                                <p className="text-sm text-muted-foreground mb-4">by {new Date(goal.deadline).toLocaleDateString()}</p>

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium">${goal.currentAmount.toLocaleString()} saved</span>
                                        <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-1000 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Monthly saving needed:</span>
                                    <span className="font-semibold flex items-center gap-1 text-green-600">
                                        ${monthlyNeeded.toFixed(0)}
                                        <ArrowUpRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
