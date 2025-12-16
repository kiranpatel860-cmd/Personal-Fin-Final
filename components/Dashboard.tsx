
import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Settings, CalendarClock, AlertCircle, Users, BellRing, Pencil } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onAddIncome: () => void;
  onAddExpense: () => void;
  onOpenSettings: () => void;
  onViewMaturities: () => void;
  onViewInvestors: () => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export const Dashboard: React.FC<Props> = ({ transactions, onAddIncome, onAddExpense, onOpenSettings, onViewMaturities, onViewInvestors, onEditTransaction }) => {
  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [transactions]);

  // Check for upcoming payments (Maturities AND Interest) in the next 30 days
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const futureLimit = new Date();
    futureLimit.setDate(today.getDate() + 30); // 30 days from now

    const payments: Array<{
      id: string;
      originalTxId: string;
      type: 'MATURITY' | 'INTEREST';
      date: Date;
      amount: number;
      name: string;
      label: string;
    }> = [];

    transactions.forEach(t => {
      if (!t.investorDetails || t.type !== TransactionType.INCOME) return;
      
      // Parse dates locally to avoid timezone shifts
      const [mY, mM, mD] = t.investorDetails.maturityDate.split('-').map(Number);
      const matDate = new Date(mY, mM - 1, mD);
      matDate.setHours(0,0,0,0);

      // 1. Check Maturity (Principal Return)
      if (matDate >= today && matDate <= futureLimit) {
        payments.push({
          id: `${t.id}-mat`,
          originalTxId: t.id,
          type: 'MATURITY',
          date: matDate,
          amount: t.amount,
          name: t.investorDetails.investorName,
          label: 'Principal Maturity'
        });
      }

      // 2. Check Periodic Interest Payment
      if (t.investorDetails.periodicInterestAmount && t.investorDetails.returnPeriod !== 'Maturity') {
        const period = t.investorDetails.returnPeriod;
        let monthsToAdd = 0;
        if (period === 'Monthly') monthsToAdd = 1;
        else if (period === 'Quarterly') monthsToAdd = 3;
        else if (period === 'Half-Yearly') monthsToAdd = 6;
        else if (period === 'Yearly') monthsToAdd = 12;

        if (monthsToAdd > 0) {
           // Parse start date locally
           const [sY, sM, sD] = t.date.split('-').map(Number);
           const startDate = new Date(sY, sM - 1, sD);
           const startDay = startDate.getDate();
           
           let nextDate = new Date(startDate);
           let multiplier = 1;

           // Fast forward to today or future
           // Loop condition: while nextDate is in the past (< today)
           // We want the first occurrence >= today
           while (nextDate < today) {
               nextDate = new Date(sY, sM - 1 + (monthsToAdd * multiplier), sD);
               // Fix overshoot (e.g. Jan 31 -> Feb 28)
               if (nextDate.getDate() !== startDay) {
                   nextDate.setDate(0); 
               }
               multiplier++;
           }
           
           // If the calculated next interest date is within 30 days AND not after maturity
           if (nextDate <= futureLimit && nextDate <= matDate) {
              payments.push({
                 id: `${t.id}-int-${nextDate.getTime()}`,
                 originalTxId: t.id,
                 type: 'INTEREST',
                 date: nextDate,
                 amount: t.investorDetails.periodicInterestAmount,
                 name: t.investorDetails.investorName,
                 label: `${period} Interest`
              });
           }
        }
      }
    });

    return payments.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [transactions]);

  // Check if any active investments exist to decide whether to show the "Investments" button
  const hasInvestments = useMemo(() => {
    return transactions.some(t => t.investorDetails?.maturityDate);
  }, [transactions]);

  const balance = totals.income - totals.expense;

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header Summary */}
      <div className="p-6 bg-white rounded-b-3xl shadow-sm z-10 relative">
        <button 
          onClick={onOpenSettings} 
          className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>

        <p className="text-sm text-slate-500 font-medium mb-1">Total Balance</p>
        <h2 className={`text-4xl font-bold mb-6 ${balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
          {balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 p-4 rounded-2xl flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-emerald-600">
              <ArrowUpCircle className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wide">Income</span>
            </div>
            <span className="text-xl font-bold text-emerald-700">
              {totals.income.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </span>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl flex flex-col">
             <div className="flex items-center gap-2 mb-2 text-rose-600">
              <ArrowDownCircle className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wide">Expense</span>
            </div>
            <span className="text-xl font-bold text-rose-700">
              {totals.expense.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="p-6 grid grid-cols-2 gap-4">
        <button 
          onClick={onAddIncome}
          className="flex flex-col items-center justify-center p-6 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all rounded-2xl shadow-lg shadow-emerald-200 text-white"
        >
          <ArrowUpCircle className="w-8 h-8 mb-2" />
          <span className="font-bold">Add Income</span>
        </button>
        <button 
          onClick={onAddExpense}
          className="flex flex-col items-center justify-center p-6 bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all rounded-2xl shadow-lg shadow-rose-200 text-white"
        >
          <ArrowDownCircle className="w-8 h-8 mb-2" />
          <span className="font-bold">Add Expense</span>
        </button>
      </div>

      {/* Conditional Buttons / Notifications */}
      <div className="px-6 mb-2 space-y-3">
         {/* Portfolio / Investments Link if exists */}
         {hasInvestments && (
           <div className="grid grid-cols-2 gap-3">
              <button 
                  onClick={onViewMaturities}
                  className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex flex-col items-start justify-center gap-1 text-blue-700 active:bg-blue-100 transition-colors"
              >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                      <CalendarClock className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-bold text-sm">Maturities</span>
                  <span className="text-[10px] text-blue-500 leading-tight">Upcoming dates</span>
              </button>

              <button 
                  onClick={onViewInvestors}
                  className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex flex-col items-start justify-center gap-1 text-indigo-700 active:bg-indigo-100 transition-colors"
              >
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mb-1">
                      <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="font-bold text-sm">Investor Accounts</span>
                  <span className="text-[10px] text-indigo-500 leading-tight">Ledgers & History</span>
              </button>
           </div>
         )}

         {/* Alert Widget */}
         {upcomingPayments.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
             <div className="flex items-center justify-between mb-3 text-amber-700">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <h3 className="font-bold">Upcoming Payments</h3>
                </div>
                <button onClick={onViewMaturities} className="text-xs font-bold underline">View All</button>
             </div>
             <div className="space-y-2">
               {upcomingPayments.slice(0, 3).map(p => (
                 <div key={p.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                        {p.type === 'INTEREST' && <BellRing className="w-3 h-3 text-amber-500" />}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        {p.type === 'MATURITY' ? (
                          <span className="text-blue-600 font-semibold">Maturity</span>
                        ) : (
                          <span className="text-amber-600 font-semibold">Interest</span>
                        )}
                         • {p.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <span className={`font-bold text-sm ${p.type === 'MATURITY' ? 'text-blue-700' : 'text-amber-700'}`}>
                      {p.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                    </span>
                 </div>
               ))}
               {upcomingPayments.length > 3 && (
                   <p className="text-center text-xs text-amber-600 font-medium mt-1">
                       +{upcomingPayments.length - 3} more
                   </p>
               )}
             </div>
          </div>
        )}
      </div>

      {/* Recent List */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-700">Recent Activity</h3>
        </div>
        
        {recentTransactions.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm group">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">{t.category}</span>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    {t.paymentMode && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-[10px] text-slate-500">
                        {t.paymentMode}
                      </span>
                    )}
                    <span>{new Date(t.date).toLocaleDateString()}</span>
                  </div>
                  {t.note && <span className="text-xs text-slate-400 mt-1">{t.note}</span>}
                  {t.investorDetails && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold mt-1 bg-blue-50 px-2 py-0.5 rounded self-start">
                       <CalendarClock className="w-3 h-3" /> Due: {new Date(t.investorDetails.maturityDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString('en-IN')}
                    </span>
                    <button 
                      onClick={() => onEditTransaction(t)}
                      className="p-1.5 rounded-full bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
