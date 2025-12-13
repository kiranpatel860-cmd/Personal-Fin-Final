
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, TransactionType, GroupedCategory } from '../types';
import { getCategories } from '../services/storageService';
import { ArrowLeft, TrendingUp, TrendingDown, BookOpen, Layers, ChevronRight, Calendar, Download, FileSpreadsheet, FileText, User, Percent, Repeat, Clock, Target, Coins } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  transactions: Transaction[];
  onBack: () => void;
}

interface CategoryStat {
  income: number;
  expense: number;
  net: number;
  count: number;
}

type Tab = 'SUMMARY' | 'CATEGORIES';

export const ReportView: React.FC<Props> = ({ transactions, onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('SUMMARY');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<GroupedCategory[]>([]);

  useEffect(() => {
    setCategories(getCategories());
  }, []);

  // --- Data Aggregation ---

  const categoryStats = useMemo(() => {
    const stats: Record<string, CategoryStat> = {};
    
    transactions.forEach(t => {
      if (!stats[t.category]) {
        stats[t.category] = { income: 0, expense: 0, net: 0, count: 0 };
      }
      if (t.type === TransactionType.INCOME) {
        stats[t.category].income += t.amount;
        stats[t.category].net += t.amount;
      } else {
        stats[t.category].expense += t.amount;
        stats[t.category].net -= t.amount;
      }
      stats[t.category].count += 1;
    });

    return stats;
  }, [transactions]);

  const groupStats = useMemo(() => {
    const stats: Record<string, { income: number; expense: number; net: number }> = {};
    
    // Helper to find group for a category using dynamic categories
    const getGroup = (catName: string) => {
      for (const group of categories) {
        if (group.items.includes(catName)) return group.group;
      }
      return "Personal"; // Default to Personal if not found
    };

    transactions.forEach(t => {
      const group = getGroup(t.category);
      if (!stats[group]) {
        stats[group] = { income: 0, expense: 0, net: 0 };
      }
      if (t.type === TransactionType.INCOME) {
        stats[group].income += t.amount;
        stats[group].net += t.amount;
      } else {
        stats[group].expense += t.amount;
        stats[group].net -= t.amount;
      }
    });

    return Object.entries(stats)
      .map(([name, vals]) => ({ name, ...vals }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net)); // Sort by magnitude
  }, [transactions, categories]);

  const ledgerTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions
      .filter(t => t.category === selectedCategory)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, selectedCategory]);

  // --- Export Functions ---

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Group Summary
    const summaryData = groupStats.map(g => ({
      "Group": g.name,
      "Total Income": g.income,
      "Total Expense": g.expense,
      "Net Balance": g.net
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Balance Sheet");

    // Sheet 2: Category Summary
    const catData = (Object.entries(categoryStats) as [string, CategoryStat][]).map(([name, stat]) => ({
      "Category": name,
      "Income": stat.income,
      "Expense": stat.expense,
      "Net": stat.net,
      "Tx Count": stat.count
    }));
    const wsCats = XLSX.utils.json_to_sheet(catData);
    XLSX.utils.book_append_sheet(wb, wsCats, "Categories");

    // Sheet 3: Full Ledger
    const ledgerData = transactions.map(t => ({
      "Date": new Date(t.date).toLocaleDateString(),
      "Type": t.type,
      "Category": t.category,
      "Amount": t.amount,
      "Payment Mode": t.paymentMode || '',
      "Note": t.note || '',
      "Investor Name": t.investorDetails?.investorName || '',
      "Purpose": t.investorDetails?.purpose || '',
      "ROI (%)": t.investorDetails?.roi || '',
      "Duration (Months)": t.investorDetails?.durationMonths || '',
      "Maturity Date": t.investorDetails?.maturityDate || '',
      "Periodic Interest": t.investorDetails?.periodicInterestAmount || ''
    }));
    const wsLedger = XLSX.utils.json_to_sheet(ledgerData);
    XLSX.utils.book_append_sheet(wb, wsLedger, "Transactions");

    // Save
    XLSX.writeFile(wb, `WealthTrack_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("WealthTrack AI - Financial Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${dateStr}`, 14, 26);

    let finalY = 30;

    // Table 1: Balance Sheet
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Balance Sheet (By Group)", 14, finalY + 10);
    
    autoTable(doc, {
      startY: finalY + 15,
      head: [['Group', 'Income', 'Expense', 'Net Balance']],
      body: groupStats.map(g => [
        g.name, 
        g.income.toLocaleString('en-IN'), 
        g.expense.toLocaleString('en-IN'), 
        g.net.toLocaleString('en-IN')
      ]),
      headStyles: { fillColor: [66, 133, 244] }, // Blue
    });
    
    // @ts-ignore
    finalY = doc.lastAutoTable.finalY + 15;

    // Table 2: Category Details
    doc.text("Category Performance", 14, finalY);
    
    const catRows = (Object.entries(categoryStats) as [string, CategoryStat][])
      .sort(([, a], [, b]) => Math.abs(b.net) - Math.abs(a.net))
      .map(([name, stat]) => [
        name,
        stat.income.toLocaleString('en-IN'),
        stat.expense.toLocaleString('en-IN'),
        stat.net.toLocaleString('en-IN')
      ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Category', 'Income', 'Expense', 'Net']],
      body: catRows,
      headStyles: { fillColor: [76, 175, 80] }, // Green
    });

    doc.save(`WealthTrack_Report_${dateStr}.pdf`);
  };

  // --- Render Helpers ---

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  };

  // --- Ledger View (Drill Down) ---
  if (selectedCategory) {
    const stats = categoryStats[selectedCategory];
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="p-4 bg-white shadow-sm flex items-center gap-4 sticky top-0 z-10">
          <button onClick={() => setSelectedCategory(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
             <h2 className="text-lg font-bold text-slate-800 leading-tight">{selectedCategory}</h2>
             <span className="text-xs text-slate-500">Ledger</span>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
          {/* Summary Card for Category */}
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 grid grid-cols-3 gap-2 text-center divide-x divide-slate-100">
             <div>
                <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Total In</p>
                <p className="font-bold text-slate-700 text-sm">{formatCurrency(stats?.income || 0)}</p>
             </div>
             <div>
                <p className="text-[10px] uppercase font-bold text-rose-600 mb-1">Total Out</p>
                <p className="font-bold text-slate-700 text-sm">{formatCurrency(stats?.expense || 0)}</p>
             </div>
             <div>
                <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">Balance</p>
                <p className={`font-bold text-sm ${(stats?.net || 0) >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                    {formatCurrency(stats?.net || 0)}
                </p>
             </div>
          </div>

          <h3 className="font-bold text-slate-700 mb-3 px-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Transactions
          </h3>
          
          <div className="space-y-3 pb-20">
            {ledgerTransactions.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">
                      {new Date(t.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-slate-800 font-medium">
                        {t.note || "No description"}
                    </span>
                  </div>
                  <span className={`font-bold text-lg ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'}
                    {Math.abs(t.amount).toLocaleString('en-IN')}
                  </span>
                </div>
                
                {/* Investor Details Block */}
                {t.investorDetails && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800 grid grid-cols-2 gap-2">
                        <div className="col-span-2 flex items-center gap-1.5 font-bold border-b border-blue-100 pb-1 mb-1">
                            <User className="w-3.5 h-3.5" />
                            {t.investorDetails.investorName}
                        </div>
                        {t.investorDetails.purpose && (
                          <div className="col-span-2 flex items-center gap-1.5 text-blue-700 mb-1">
                             <Target className="w-3.5 h-3.5" />
                             Purpose: {t.investorDetails.purpose}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5 opacity-60" />
                            {t.investorDetails.roi}% ROI
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Repeat className="w-3.5 h-3.5 opacity-60" />
                            {t.investorDetails.returnPeriod}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-60" />
                            {t.investorDetails.durationMonths} Months
                        </div>
                        {t.investorDetails.periodicInterestAmount && (
                           <div className="col-span-2 flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-100 mt-1">
                               <Coins className="w-3.5 h-3.5" />
                               Pay: {formatCurrency(t.investorDetails.periodicInterestAmount)} / {t.investorDetails.returnPeriod}
                           </div>
                        )}
                        <div className="col-span-2 flex items-center gap-1.5 font-semibold text-blue-900 bg-blue-100/50 p-1 rounded mt-1">
                            <span>Maturity:</span>
                            {new Date(t.investorDetails.maturityDate).toLocaleDateString()}
                        </div>
                    </div>
                )}

                {t.paymentMode && (
                  <div className="self-start px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {t.paymentMode}
                  </div>
                )}
              </div>
            ))}
            {ledgerTransactions.length === 0 && (
              <p className="text-center text-slate-400 py-4">No transactions found.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Main Report View ---
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">Reports</h2>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportExcel}
              className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              title="Download Excel"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </button>
            <button 
              onClick={handleExportPDF}
              className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
              title="Download PDF"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex px-4 border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('SUMMARY')}
            className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'SUMMARY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
          >
            <Layers className="w-4 h-4" /> Balance Sheet
          </button>
          <button 
            onClick={() => setActiveTab('CATEGORIES')}
            className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'CATEGORIES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
          >
            <BookOpen className="w-4 h-4" /> Categories
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-20">
        
        {activeTab === 'SUMMARY' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                <p className="text-blue-800 text-sm text-center">
                    This balance sheet aggregates all your transactions by major groups to show your net position in each area.
                </p>
            </div>

            {groupStats.map(group => (
              <div key={group.name} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-lg">{group.name}</h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${group.net >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        Net: {formatCurrency(group.net)}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl">
                        <div className="flex items-center gap-2 mb-1 text-emerald-600">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">Inflow</span>
                        </div>
                        <p className="font-semibold text-slate-700">{formatCurrency(group.income)}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                        <div className="flex items-center gap-2 mb-1 text-rose-600">
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">Outflow</span>
                        </div>
                        <p className="font-semibold text-slate-700">{formatCurrency(group.expense)}</p>
                    </div>
                </div>
              </div>
            ))}
             {groupStats.length === 0 && <p className="text-center text-slate-400 py-10">No data available.</p>}
          </div>
        )}

        {activeTab === 'CATEGORIES' && (
          <div className="space-y-3">
             <div className="bg-slate-100 p-3 rounded-lg text-slate-500 text-xs text-center mb-2">
                Tap on any category to view its transaction ledger.
             </div>

             {Object.keys(categoryStats).length === 0 && (
                <p className="text-center text-slate-400 py-10">No transactions recorded yet.</p>
             )}

             {(Object.entries(categoryStats) as [string, CategoryStat][])
                .sort(([, a], [, b]) => Math.abs(b.net) - Math.abs(a.net))
                .map(([name, stats]) => (
                <button 
                  key={name}
                  onClick={() => setSelectedCategory(name)}
                  className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 active:scale-[0.99] transition-transform"
                >
                  <div className="w-full flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-800 text-left text-lg">{name}</span>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                  
                  <div className="w-full flex justify-between items-center text-sm">
                    <div className="flex gap-4">
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Given (Exp)</span>
                            <span className="text-rose-600 font-semibold">{stats.expense > 0 ? '-' : ''}{Math.abs(stats.expense).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex flex-col items-start">
                             <span className="text-[10px] text-slate-400 font-bold uppercase">Taken (Inc)</span>
                             <span className="text-emerald-600 font-semibold">{stats.income > 0 ? '+' : ''}{Math.abs(stats.income).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Net Balance</span>
                        <span className={`font-bold text-base ${stats.net >= 0 ? 'text-blue-600' : 'text-slate-700'}`}>
                            {formatCurrency(stats.net)}
                        </span>
                    </div>
                  </div>
                </button>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
