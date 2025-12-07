
import React, { useState, useEffect } from 'react';
import { PAYMENT_MODES } from '../constants';
import { getCategories } from '../services/storageService';
import { TransactionType, GroupedCategory } from '../types';
import { Button } from './Button';
import { ArrowLeft, Calendar, FileText, IndianRupee, CreditCard } from 'lucide-react';

interface Props {
  type: TransactionType;
  onSave: (data: { amount: number; category: string; paymentMode: string; date: string; note: string }) => void;
  onCancel: () => void;
}

export const TransactionForm: React.FC<Props> = ({ type, onSave, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState<GroupedCategory[]>([]);

  useEffect(() => {
    setCategories(getCategories());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    
    // Strict validation: Must have amount, must be a number, must be positive, must have category
    if (!amount || isNaN(val) || val <= 0 || !category) return;
    
    onSave({
      amount: val,
      category,
      paymentMode,
      date,
      note
    });
  };

  const isIncome = type === TransactionType.INCOME;
  const themeColor = isIncome ? 'text-emerald-600' : 'text-rose-600';
  const bgColor = isIncome ? 'bg-emerald-50' : 'bg-rose-50';

  return (
    <div className="flex flex-col h-full bg-white">
      <div className={`p-4 flex items-center gap-4 ${bgColor}`}>
        <button onClick={onCancel} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
          <ArrowLeft className={`w-5 h-5 ${themeColor}`} />
        </button>
        <h2 className={`text-xl font-bold ${themeColor}`}>
          Add {isIncome ? 'Income' : 'Expense'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
        
        {/* Amount Input */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Amount</label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-4 text-3xl font-bold text-slate-800 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-slate-300"
              required
              autoFocus
            />
          </div>
        </div>

        {/* Category Select */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Category / Project</label>
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value)}
            className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="" disabled>Select a category</option>
            {categories.map(group => (
              <optgroup key={group.group} label={group.group}>
                {group.items.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Payment Mode */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Mode of Payment</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_MODES.map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                  paymentMode === mode 
                    ? `bg-slate-800 text-white border-slate-800 shadow-md` 
                    : `bg-white text-slate-500 border-slate-200 hover:border-slate-300`
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Note (Optional)</label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Description..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-auto pt-4">
          <Button 
            type="submit" 
            variant={isIncome ? 'income' : 'expense'} 
            fullWidth
            disabled={!amount || parseFloat(amount) <= 0 || !category}
          >
            Save Transaction
          </Button>
        </div>
      </form>
    </div>
  );
};
