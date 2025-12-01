import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { RAW_SAMPLE_DATA } from '../utils/mockData';
import { cleanTransactions } from '../utils/aiLogic';
import { extractTextFromPDF } from '../utils/pdfParser';
import clsx from 'clsx';

interface DataIngestionProps {
    onNavigate: (tab: string) => void;
}

export const DataIngestion: React.FC<DataIngestionProps> = ({ onNavigate }) => {
    const { addTransactions, transactions, setTransactions } = useStore();
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<string>('');
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const processFiles = async (files: FileList | File[]) => {
        setIsProcessing(true);
        setUploadStatus('idle');
        let successCount = 0;
        let errorCount = 0;

        const fileArray = Array.from(files);

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            console.log(`Processing file: ${file.name}, type: ${file.type}`);
            setProcessingStatus(`Processing file ${i + 1} of ${fileArray.length}: ${file.name}`);

            if (file.type !== 'application/pdf' && file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                console.warn(`Skipping invalid file: ${file.name}`);
                errorCount++;
                continue;
            }

            try {
                let textLines: string[] = [];

                // 1. Extract text
                if (file.type === 'application/pdf') {
                    console.log('Starting PDF extraction...');
                    textLines = await extractTextFromPDF(file);
                    console.log(`PDF extracted, lines: ${textLines.length}`);
                } else {
                    // Handle CSV/Text
                    const text = await file.text();
                    textLines = text.split('\n').filter(line => line.trim().length > 0);
                    console.log(`CSV/Text extracted, lines: ${textLines.length}`);
                }

                // 2. Send to backend for analysis
                console.log('Sending request to backend...');
                const response = await fetch('http://localhost:8000/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: textLines
                    }),
                });
                console.log(`Backend response status: ${response.status}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Backend error:', errorData);
                    throw new Error(errorData.detail || 'Failed to analyze statement');
                }

                const data = await response.json();
                console.log('Backend data received:', data);

                if (data.transactions && Array.isArray(data.transactions)) {
                    // Add IDs if missing (backend might not generate them)
                    const transactionsWithIds = data.transactions.map((t: any, index: number) => ({
                        ...t,
                        id: t.id || `ai_${Date.now()}_${i}_${index}`,
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
                        // Force re-fetch to ensure sync
                        await useStore.getState().fetchTransactions();
                    } catch (err) {
                        console.error("Failed to persist transactions", err);
                    }

                    if (data.closing_balance !== undefined) {
                        useStore.getState().setClosingBalance(data.closing_balance);
                    }
                    successCount++;
                } else {
                    console.error('Invalid data format:', data);
                    throw new Error('Invalid response format from backend');
                }

            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
                errorCount++;
                // Continue to next file
            }
        }

        setIsProcessing(false);
        setProcessingStatus('');

        if (successCount > 0) {
            setUploadStatus('success');
            setTimeout(() => {
                onNavigate('dashboard');
            }, 2000);
        } else if (errorCount > 0) {
            setUploadStatus('error');
            alert(`Failed to process files. Check console for details.`);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    };

    const handleClearData = async () => {
        if (confirm('Are you sure you want to clear all uploaded data? This cannot be undone.')) {
            try {
                await fetch('http://localhost:8000/transactions', {
                    method: 'DELETE',
                });
                setTransactions([]);
                setUploadStatus('idle');
            } catch (error) {
                console.error("Failed to clear backend data", error);
                alert("Failed to clear data from server.");
            }
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
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Data Ingestion</h2>
                    <p className="text-muted-foreground mt-2">
                        Upload your bank statements (PDF/CSV) to get AI-powered insights.
                    </p>
                </div>
                {transactions.length > 0 && (
                    <button
                        onClick={handleClearData}
                        className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    >
                        Clear All Data
                    </button>
                )}
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
                        multiple
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
                            ? processingStatus || 'Extracting and categorizing transactions...'
                            : 'Drag and drop your PDF or CSV files here, or click to browse. You can upload multiple files.'}
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

                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
                                useStore.getState().clearData();
                            }
                        }}
                        disabled={isProcessing}
                        className="w-full mt-4 py-3 bg-red-500/10 text-red-600 border border-red-500/20 rounded-lg font-medium hover:bg-red-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        Clear All Data
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
                                        {t.merchant?.[0] || '?'}
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
