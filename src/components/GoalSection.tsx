import React from 'react';
import { useStore } from '../store/useStore';
import { Shield, Plane, Laptop, Plus, Sparkles, ArrowUpRight, Target, Calculator, ArrowRight, Trash2 } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
    'Shield': <Shield className="w-6 h-6" />,
    'Plane': <Plane className="w-6 h-6" />,
    'Laptop': <Laptop className="w-6 h-6" />,
};

export const GoalSection: React.FC = () => {
    const { goals, addGoal, removeGoal, transactions } = useStore();
    const [isCreating, setIsCreating] = React.useState(false);
    const [newGoals, setNewGoals] = React.useState([{
        name: '',
        targetAmount: '',
        deadline: '',
        icon: 'Target'
    }]);
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

    const handleAddGoals = async (e: React.FormEvent) => {
        e.preventDefault();

        const validGoals = newGoals.filter(g => g.name && g.targetAmount && g.deadline);
        if (validGoals.length === 0) return;

        const goalsPayload = validGoals.map(g => ({
            name: g.name,
            target_amount: Number(g.targetAmount),
            current_amount: 0,
            deadline: g.deadline
        }));

        // Persist to backend (Bulk)
        try {
            const response = await fetch('http://localhost:8000/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goalsPayload)
            });

            if (response.ok) {
                const savedGoals = await response.json();
                // Update local store
                savedGoals.forEach((g: any) => {
                    addGoal({
                        id: g.id.toString(),
                        name: g.name,
                        targetAmount: g.target_amount,
                        currentAmount: g.current_amount,
                        deadline: g.deadline,
                        icon: 'Target'
                    });
                });
            }
        } catch (err) {
            console.error("Failed to persist goals", err);
        }

        setIsCreating(false);
        setNewGoals([{ name: '', targetAmount: '', deadline: '', icon: 'Target' }]);
    };

    const handleDeleteGoal = (id: string) => {
        if (confirm('Are you sure you want to delete this goal?')) {
            removeGoal(id);
        }
    };

    const addNewGoalForm = () => {
        setNewGoals([...newGoals, { name: '', targetAmount: '', deadline: '', icon: 'Target' }]);
    };

    const updateGoalForm = (index: number, field: string, value: string) => {
        const updatedGoals = [...newGoals];
        updatedGoals[index] = { ...updatedGoals[index], [field]: value };
        setNewGoals(updatedGoals);
    };

    const removeGoalForm = (index: number) => {
        if (newGoals.length > 1) {
            const updatedGoals = newGoals.filter((_, i) => i !== index);
            setNewGoals(updatedGoals);
        }
    };

    React.useEffect(() => {
        const fetchInsight = async () => {
            if (transactions.length === 0 || goals.length === 0) return;

            setLoadingInsight(true);
            try {
                const response = await fetch('http://localhost:8000/insight', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transactions,
                        goals
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
    }, [transactions, goals]);

    const runSimulation = async () => {
        setSimulating(true);
        try {
            const response = await fetch('http://localhost:8000/savings-scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactions,
                    goals,
                    extra_savings: extraSavings
                })
            });

            if (response.ok) {
                const data = await response.json();
                setScenario(data);
            } else {
                console.error("Simulation failed:", await response.text());
            }
        } catch (error) {
            console.error("Simulation error:", error);
        } finally {
            setSimulating(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Financial Goals</h2>
                    <p className="text-muted-foreground mt-2">
                        Track your progress and simulate savings scenarios.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Goal
                </button>
            </div>

            {/* AI Insight Banner */}
            {loadingInsight ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 animate-pulse">
                    <div className="h-4 bg-primary/20 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-primary/10 rounded w-2/3"></div>
                </div>
            ) : insight ? (
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-6 flex items-start gap-4">
                    <div className="p-3 bg-primary/20 rounded-full shrink-0">
                        <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-1">AI Insight</h3>
                        <p className="text-muted-foreground mb-2">{insight.insight_text}</p>
                        {insight.impacted_goal !== 'None' && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-background rounded-full text-xs font-medium border border-border">
                                <Target className="w-3 h-3 text-primary" />
                                Impact on: {insight.impacted_goal}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            <div className="grid md:grid-cols-3 gap-6">
                {goals.map((goal) => {
                    const monthlyNeeded = calculateMonthlySavings(goal.targetAmount, goal.currentAmount, goal.deadline);
                    const progress = (goal.currentAmount / goal.targetAmount) * 100;

                    return (
                        <div key={goal.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    {iconMap[goal.icon] || <Target className="w-6 h-6" />}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Target</p>
                                    <p className="font-bold text-lg">${goal.targetAmount.toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={() => handleDeleteGoal(goal.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <h3 className="font-semibold text-lg mb-1">{goal.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Save <strong>${monthlyNeeded.toFixed(0)}/mo</strong> to reach by {new Date(goal.deadline).toLocaleDateString()}
                            </p>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>${goal.currentAmount.toLocaleString()} saved</span>
                                    <span className="font-medium">{progress.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-1000 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* What-If Simulator */}
            <div className="bg-card border border-border rounded-xl p-8 mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Calculator className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">"What-If" Simulator</h3>
                        <p className="text-muted-foreground">See how extra savings can accelerate your goals.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Extra Monthly Savings</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="50"
                                    max="2000"
                                    step="50"
                                    value={extraSavings}
                                    onChange={(e) => setExtraSavings(Number(e.target.value))}
                                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="px-4 py-2 bg-muted rounded-lg font-mono font-bold w-24 text-center">
                                    ${extraSavings}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={runSimulation}
                            disabled={simulating}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                        >
                            {simulating ? (
                                <>Simulating...</>
                            ) : (
                                <>
                                    Run Simulation <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="md:col-span-2 bg-muted/30 rounded-xl p-6 border border-border">
                        {scenario ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="w-5 h-5 text-purple-600 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-lg">Impact Analysis</h4>
                                        <p className="text-muted-foreground">{scenario.impact_description}</p>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                                    {scenario.new_deadlines.map((d, i) => (
                                        <div key={i} className="bg-background p-4 rounded-lg border border-border shadow-sm">
                                            <p className="font-medium text-sm text-muted-foreground">{d.goal_name}</p>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <span className="text-lg font-bold text-green-600">
                                                    {new Date(d.new_date).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                    {d.months_saved} months sooner!
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-700">
                                    <strong>Suggestion:</strong> {scenario.trade_off_suggestion}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                                <ArrowUpRight className="w-12 h-12 mb-4 opacity-20" />
                                <p>Adjust the slider and run a simulation to see how faster you can reach your goals.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Goal Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-md rounded-xl shadow-2xl p-6 animate-in zoom-in-95">
                        <h3 className="text-xl font-bold mb-4">Create New Goals</h3>
                        <form onSubmit={handleAddGoals} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                            {newGoals.map((goal, index) => (
                                <div key={index} className="space-y-4 p-4 border border-border rounded-lg relative">
                                    {newGoals.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeGoalForm(index)}
                                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Goal Name</label>
                                        <input
                                            type="text"
                                            value={goal.name}
                                            onChange={(e) => updateGoalForm(index, 'name', e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                                            placeholder="e.g., New Car"
                                            autoFocus={index === 0}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Target Amount ($)</label>
                                            <input
                                                type="number"
                                                value={goal.targetAmount}
                                                onChange={(e) => updateGoalForm(index, 'targetAmount', e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                                                placeholder="5000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Target Date</label>
                                            <input
                                                type="date"
                                                value={goal.deadline}
                                                onChange={(e) => updateGoalForm(index, 'deadline', e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addNewGoalForm}
                                className="w-full py-2 border border-dashed border-primary/30 rounded-lg text-primary hover:bg-primary/5 flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Another Goal
                            </button>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Create Goals
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
