import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Target, Upload, MessageSquare, Menu, Sun, Moon, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { ChatPanel } from './ChatPanel';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'goals', label: 'Goals', icon: Target },
        { id: 'budget', label: 'Budget', icon: Wallet },
        { id: 'data', label: 'Data Ingestion', icon: Upload },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
                <div className="p-6 border-b border-border">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        FinDash
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                activeTab === item.id
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-border">
                    {/* Footer area */}
                </div>
            </aside>

            {/* Main Content */}
            <main className={clsx(
                "flex-1 flex flex-col transition-all duration-300 ease-in-out",
                isChatOpen ? "mr-96" : ""
            )}>
                {/* Header */}
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden p-2 hover:bg-muted rounded-md">
                            <Menu className="w-5 h-5" />
                        </button>
                        <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all",
                                isChatOpen
                                    ? "bg-primary/10 border-primary/20 text-primary"
                                    : "bg-background border-border hover:bg-muted"
                            )}
                        >
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                {isChatOpen ? 'Hide Assistant' : 'Ask AI'}
                            </span>
                        </button>
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 rounded-full hover:bg-muted transition-colors"
                            aria-label="Toggle theme"
                        >
                            {isDarkMode ? (
                                <Sun className="w-5 h-5 text-yellow-500" />
                            ) : (
                                <Moon className="w-5 h-5 text-slate-700" />
                            )}
                        </button>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>

            {/* Chat Panel */}
            <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
    );
};
