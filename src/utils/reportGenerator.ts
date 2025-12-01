import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, max } from 'date-fns';
import type { Transaction, Goal } from '../types';

export const generatePDFReport = (
    transactions: Transaction[],
    goals: Goal[]
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Helper Functions ---
    const centerText = (text: string, y: number, size: number = 12) => {
        doc.setFontSize(size);
        const textWidth = doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, y);
    };

    // --- Data Preparation ---
    const latestDate = transactions.length > 0
        ? max(transactions.map(t => parseISO(t.date)))
        : new Date();

    const currentMonthStart = startOfMonth(latestDate);
    const currentMonthEnd = endOfMonth(latestDate);

    const currentMonthTransactions = transactions.filter(t => {
        try {
            return isWithinInterval(parseISO(t.date), { start: currentMonthStart, end: currentMonthEnd });
        } catch { return false; }
    });

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = totalIncome - totalExpenses;

    const currentMonthIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const currentMonthExpenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // --- PDF Content ---

    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    centerText("Financial Health Report", 20, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    centerText(`Generated on ${format(new Date(), 'MMMM d, yyyy')}`, 28, 10);

    // Executive Summary
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Executive Summary", 14, 40);

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Report Period: ${format(latestDate, 'MMMM yyyy')}`, 14, 50);
    doc.text(`Total Balance: $${currentBalance.toLocaleString()}`, 14, 58);
    doc.text(`Active Goals: ${goals.length}`, 14, 66);

    // Current Month Overview Table
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Current Month Overview", 14, 85);

    autoTable(doc, {
        startY: 90,
        head: [['Metric', 'Value']],
        body: [
            ['Income', `$${currentMonthIncome.toLocaleString()}`],
            ['Expenses', `$${currentMonthExpenses.toLocaleString()}`],
            ['Net Flow', `$${(currentMonthIncome - currentMonthExpenses).toLocaleString()}`],
            ['Transaction Count', `${currentMonthTransactions.length}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [63, 81, 181] },
    });

    // Top Spending Categories (Current Month)
    const categoryTotals: Record<string, number> = {};
    currentMonthTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            const cat = t.category || 'Other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
        });

    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const finalY = (doc as any).lastAutoTable.finalY || 150;

    doc.setFontSize(14);
    doc.text("Top Spending Categories (This Month)", 14, finalY + 15);

    autoTable(doc, {
        startY: finalY + 20,
        head: [['Category', 'Amount']],
        body: topCategories.map(([cat, amount]) => [cat, `$${amount.toLocaleString()}`]),
        theme: 'grid',
        headStyles: { fillColor: [220, 53, 69] }, // Red for expenses
    });

    // All Time Summary
    const finalY2 = (doc as any).lastAutoTable.finalY || 200;
    doc.setFontSize(14);
    doc.text("All-Time Summary", 14, finalY2 + 15);

    autoTable(doc, {
        startY: finalY2 + 20,
        head: [['Metric', 'Total Amount']],
        body: [
            ['Total Income Earned', `$${totalIncome.toLocaleString()}`],
            ['Total Expenses', `$${totalExpenses.toLocaleString()}`],
            ['Total Saved (Goals)', `$${goals.reduce((sum, g) => sum + g.currentAmount, 0).toLocaleString()}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [40, 167, 69] }, // Green for summary
    });

    // Save
    doc.save(`Financial_Report_${format(latestDate, 'yyyy_MM')}.pdf`);
};
