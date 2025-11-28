import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, ArrowRight, Loader2, Key } from 'lucide-react';
import { useStore } from '../store/useStore';
import { RAW_SAMPLE_DATA } from '../utils/mockData';
import { cleanTransactions } from '../utils/aiLogic';
import { extractTextFromPDF } from '../utils/pdfParser';
import clsx from 'clsx';

interface DataIngestionProps {
    onNavigate: (tab: string) => void;
}

export const DataIngestion: React.FC<DataIngestionProps> = ({ onNavigate }) => {
    const { addTransactions, transactions, apiKey, setApiKey, apiEndpoint, setApiEndpoint } = useStore();
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const processFile = async (file: File) => {
        if (file.type !== 'application/pdf' && file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            alert('Please upload a PDF or CSV file.');
            return;
        }

        if (!apiKey.startsWith('sk-') && !apiEndpoint.includes('localhost')) {
            // Basic validation, strict only if using standard OpenAI
            if (!apiKey) {
                alert('Please enter a valid API Key.');
                return;
            }
        }

        setIsProcessing(true);
        setUploadStatus('idle');

        try {
            let textLines: string[] = [];

            // 1. Extract text
            if (file.type === 'application/pdf') {
                textLines = await extractTextFromPDF(file);
            } else {
                // Handle CSV/Text
                const text = await file.text();
                textLines = text.split('\n').filter(line => line.trim().length > 0);
            }

            // 2. Send to backend for analysis
            const response = await fetch('http://localhost:8000/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: textLines,
                    api_key: apiKey,
                    api_endpoint: apiEndpoint
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to analyze statement');
            }

            const data = await response.json();

            if (data.transactions && Array.isArray(data.transactions)) {
                // Add IDs if missing (backend might not generate them)
                const transactionsWithIds = data.transactions.map((t: any, index: number) => ({
                    ...t,
                    id: t.id || `ai_${Date.now()}_${index}`,
                    amount: Number(t.amount) // Ensure number
                }));
                addTransactions(transactionsWithIds);

                // Persist to backend
                try {
                    await fetch('http://localhost:8000/transactions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(transactionsWithIds)
                    });
                } catch (err) {
                    console.error("Failed to persist transactions", err);
                    // Don't block UI success on persistence failure for now, or maybe show warning
                }

                if (data.closing_balance !== undefined) {
                    useStore.getState().setClosingBalance(data.closing_balance);
                }

                setUploadStatus('success');
                // Auto-navigate to dashboard after short delay
                setTimeout(() => {
                    onNavigate('dashboard');
                }, 1500);
            } else {
                throw new Error('Invalid response format from backend');
            }

        } catch (error) {
            console.error('Error processing file:', error);
            setUploadStatus('error');
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const loadSampleData = () => {
        setIsProcessing(true);
        setUploadStatus('idle');

        // Simulate processing delay
        setTimeout(() => {
            const cleaned = cleanTransactions(RAW_SAMPLE_DATA);
            addTransactions(cleaned);
            setIsProcessing(false);
            setUploadStatus('success');
            setTimeout(() => {
                onNavigate('dashboard');
            }, 1500);
        }, 1500);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Data Ingestion</h2>
                <p className="text-muted-foreground mt-2">
                    Upload your bank statements to get AI-powered insights.
                </p>
            </div>

            {/* API Configuration */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Key className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold">AI Configuration</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">API Endpoint</label>
                        <input
                            type="text"
                            value={apiEndpoint}
                            onChange={(e) => setApiEndpoint(e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Credentials are used only for this session and sent directly to the backend.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Upload Area */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={clsx(
                        "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                        isDragging
                            ? "border-primary bg-primary/5 scale-[1.02]"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,.csv"
                        className="hidden"
                    />

                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                        {isProcessing ? (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        ) : (
                            <Upload className="w-8 h-8 text-primary" />
                        )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                        {isProcessing ? 'Analyzing Statement...' : 'Upload Bank Statement'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                        {isProcessing
                            ? 'Extracting and categorizing transactions with AI...'
                            : 'Drag and drop your PDF or CSV files here, or click to browse.'}
                    </p>
                    <button
                        disabled={isProcessing}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
                    >
                        Browse Files
                    </button>
                </div>

                {/* Sample Data Area */}
                <div className="bg-card border border-border rounded-xl p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-semibold">Load Sample Data</h3>
                        </div>
                        <p className="text-muted-foreground mb-6">
                            Don't have a statement handy? Load our robust sample dataset to explore the dashboard features.
                        </p>
                    </div>

                    <button
                        onClick={loadSampleData}
                        disabled={isProcessing}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>Processing...</>
                        ) : (
                            <>
                                Load Sample Data <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Status / Preview */}
            {uploadStatus === 'success' && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3 text-green-600 animate-in slide-in-from-bottom-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Successfully processed {transactions.length} transactions!</span>
                </div>
            )}

            {transactions.length > 0 && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/30">
                        <h3 className="font-semibold">Recent Transactions</h3>
                    </div>
                    <div className="divide-y divide-border">
                        {transactions.slice(0, 5).map((t) => (
                            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold",
                                        t.category === 'Groceries' ? "bg-green-100 text-green-700" :
                                            t.category === 'Transport' ? "bg-blue-100 text-blue-700" :
                                                t.category === 'Entertainment' ? "bg-purple-100 text-purple-700" :
                                                    "bg-gray-100 text-gray-700"
                                    )}>
                                        {t.merchant[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium">{t.merchant}</p>
                                        <p className="text-xs text-muted-foreground">{t.date} • {t.category}</p>
                                    </div>
                                </div>
                                <div className="font-semibold">
                                    -${t.amount.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
