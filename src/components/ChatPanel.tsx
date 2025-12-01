import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Check, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import clsx from 'clsx';

interface ChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose }) => {
    const [input, setInput] = useState('');

    const { chatHistory, addChatMessage, transactions, moveBudget, addGoal } = useStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [processedActions, setProcessedActions] = useState<Set<string>>(new Set());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        // Add User Message
        const userMsg = {
            id: Date.now().toString(),
            role: 'user' as const,
            content: input,
            timestamp: new Date().toISOString()
        };
        addChatMessage(userMsg);
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: userMsg.content,
                    transactions: transactions
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown server error' }));
                throw new Error(errorData.detail || 'Failed to get response');
            }

            const data = await response.json();
            const agentResponse = data; // Backend returns the object directly { type, details, message }

            if (!agentResponse || !agentResponse.message) {
                throw new Error('Invalid response format from server');
            }

            const aiMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: agentResponse.message || "I'm not sure how to answer that.",
                action: agentResponse.type !== 'none' ? agentResponse : undefined,
                timestamp: new Date().toISOString()
            };
            addChatMessage(aiMsg);
        } catch (error: any) {
            console.error("Chat error:", error);
            const errorMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: `❌ Error: ${error.message || "I'm having trouble connecting to the server."}`,
                timestamp: new Date().toISOString()
            };
            addChatMessage(errorMsg);
        } finally {
            setIsTyping(false);
        }
    };

    const handleApproveAction = (msgId: string, action: any) => {
        if (processedActions.has(msgId)) return;

        if (action.type === 'move_budget') {
            moveBudget(action.details.from_category, action.details.to_category, action.details.amount);
            addChatMessage({
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ Done! I've moved $${action.details.amount} from ${action.details.from_category} to ${action.details.to_category}.`,
                timestamp: new Date().toISOString()
            });
        } else if (action.type === 'create_goal') {
            addGoal({
                id: Date.now().toString(),
                name: action.details.name,
                targetAmount: action.details.target_amount,
                currentAmount: 0,
                deadline: action.details.deadline,
                icon: 'Target'
            });
            addChatMessage({
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ Goal created! I've set up a goal to save $${action.details.target_amount} for ${action.details.name}.`,
                timestamp: new Date().toISOString()
            });
        }

        setProcessedActions(prev => new Set(prev).add(msgId));
    };

    const handleRejectAction = (msgId: string) => {
        if (processedActions.has(msgId)) return;

        addChatMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: "❌ Action cancelled.",
            timestamp: new Date().toISOString()
        });

        setProcessedActions(prev => new Set(prev).add(msgId));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col z-50">
            {/* Header */}
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">FinAI Assistant</h3>
                        <p className="text-xs text-muted-foreground">Always here to help</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg) => (
                    <div
                        key={msg.id}
                        className={clsx(
                            "flex gap-3 max-w-[90%]",
                            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                        )}
                    >
                        <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className={clsx(
                                "p-3 rounded-lg text-sm",
                                msg.role === 'user'
                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                    : "bg-muted text-foreground rounded-tl-none"
                            )}>
                                {msg.content}
                            </div>
                            {/* Action Card */}
                            {msg.action && (
                                <div className="bg-card border border-border rounded-lg p-3 shadow-sm text-sm">
                                    <p className="font-medium mb-2">Proposed Action:</p>
                                    {msg.action.type === 'move_budget' && (
                                        <div className="mb-3 text-muted-foreground">
                                            Move <strong>${msg.action.details.amount}</strong> from <strong>{msg.action.details.from_category}</strong> to <strong>{msg.action.details.to_category}</strong>?
                                        </div>
                                    )}
                                    {msg.action.type === 'create_goal' && (
                                        <div className="mb-3 text-muted-foreground">
                                            Create goal <strong>{msg.action.details.name}</strong> for <strong>${msg.action.details.target_amount}</strong>?
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApproveAction(msg.id, msg.action)}
                                            disabled={processedActions.has(msg.id)}
                                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Check className="w-3 h-3" /> Confirm
                                        </button>
                                        <button
                                            onClick={() => handleRejectAction(msg.id)}
                                            disabled={processedActions.has(msg.id)}
                                            className="px-3 py-1.5 bg-muted text-muted-foreground rounded text-xs font-medium hover:bg-muted/80 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <XCircle className="w-3 h-3" /> Deny
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
                {isTyping && (
                    <div className="flex gap-3 max-w-[90%]">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="bg-muted text-foreground rounded-tl-none p-3 rounded-lg text-sm">
                            <span className="animate-pulse">...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about your spending..."
                        className="flex-1 bg-muted/50 border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
