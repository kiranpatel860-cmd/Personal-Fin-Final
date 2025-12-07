
import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Settings } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onAddIncome: () => void;
  onAddExpense: () => void;
  onOpenSettings: () => void;
}

export const Dashboard: React.FC<Props> = ({ transactions, onAddIncome, onAddExpense, onOpenSettings }) => {
  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
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
              <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
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
                </div>
                <span className={`font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
