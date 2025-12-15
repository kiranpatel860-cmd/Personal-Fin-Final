
import React, { useState, useEffect, useMemo } from 'react';
import { PAYMENT_MODES } from '../constants';
import { getCategories, ensureInvestorCategory } from '../services/storageService';
import { TransactionType, GroupedCategory, InvestorDetails } from '../types';
import { Button } from './Button';
import { ArrowLeft, Calendar, FileText, IndianRupee, User, Percent, Repeat, Clock, CalendarClock, HelpCircle, Target, Calculator, BellRing } from 'lucide-react';

interface Props {
  type: TransactionType;
  initialData?: {
    category?: string;
    note?: string;
    amount?: number;
  };
  onSave: (data: { 
    amount: number; 
    category: string; 
    paymentMode: string; 
    date: string; 
    note: string;
    investorDetails?: InvestorDetails;
  }) => void;
  onCancel: () => void;
}

// Helper component for tooltips
const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex items-center ml-1 align-middle">
    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-blue-500 transition-colors cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] leading-tight rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-xl">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

export const TransactionForm: React.FC<Props> = ({ type, initialData, onSave, onCancel }) => {
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(initialData?.note || '');
  const [categories, setCategories] = useState<GroupedCategory[]>([]);

  // Investor specific fields
  const [investorName, setInvestorName] = useState('');
  const [roi, setRoi] = useState('');
  const [returnPeriod, setReturnPeriod] = useState<InvestorDetails['returnPeriod']>('Monthly');
  const [duration, setDuration] = useState('');
  const [purpose, setPurpose] = useState('');

  useEffect(() => {
    setCategories(getCategories());
  }, []);

  // Update form if initialData changes (e.g. triggered by Record Payment button)
  useEffect(() => {
    if (initialData) {
      if (initialData.amount) setAmount(initialData.amount.toString());
      if (initialData.category) setCategory(initialData.category);
      if (initialData.note) setNote(initialData.note);
    }
  }, [initialData]);

  const isInvestorFund = category === 'Investor Funds';

  // Get existing investors for autocomplete suggestions
  const existingInvestors = useMemo(() => {
    const investorGroup = categories.find(c => c.group === "Investor Payments");
    if (!investorGroup) return [];
    
    // Filter out system categories to leave only Names
    const systemCategories = ["Investor Funds", "Interest Payment", "Principal Return"];
    return investorGroup.items.filter(item => !systemCategories.includes(item));
  }, [categories]);

  // Robust Maturity Date Calculation
  const maturityDate = useMemo(() => {
    if (!date || !duration) return '';
    const monthsToAdd = parseInt(duration);
    if (isNaN(monthsToAdd)) return '';
    
    // Split manually to avoid timezone issues with Date("YYYY-MM-DD") which is UTC
    const [y, m, d] = date.split('-').map(Number);
    // Create local date object (month is 0-indexed)
    const targetDate = new Date(y, m - 1 + monthsToAdd, d);
    
    // Format back to YYYY-MM-DD
    const yy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    
    return `${yy}-${mm}-${dd}`;
  }, [date, duration]);

  // Periodic Interest Calculation
  const interestAmount = useMemo(() => {
    if (!amount || !roi || !returnPeriod || returnPeriod === 'Maturity') return 0;
    const principal = parseFloat(amount);
    const rate = parseFloat(roi);
    if (isNaN(principal) || isNaN(rate)) return 0;

    const annualInterest = (principal * rate) / 100;
    
    switch (returnPeriod) {
      case 'Monthly': return annualInterest / 12;
      case 'Quarterly': return annualInterest / 4;
      case 'Half-Yearly': return annualInterest / 2;
      case 'Yearly': return annualInterest;
      default: return 0;
    }
  }, [amount, roi, returnPeriod]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    let investorDetails: InvestorDetails | undefined;
    
    if (isInvestorFund) {
      if (!investorName || !roi || !duration || !maturityDate) {
        alert("Please fill all investor details");
        return;
      }
      investorDetails = {
        investorName,
        roi: parseFloat(roi),
        returnPeriod,
        durationMonths: parseInt(duration),
        maturityDate,
        purpose,
        periodicInterestAmount: interestAmount > 0 ? interestAmount : undefined
      };
      
      // AUTO-UPDATE: Add this investor to expense categories
      ensureInvestorCategory(investorName);
    }

    onSave({
      amount: parseFloat(amount),
      category,
      paymentMode,
      date,
      note,
      investorDetails
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white shadow-sm flex items-center gap-4 sticky top-0 z-10">
        <button onClick={onCancel} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">
          {type === TransactionType.INCOME ? 'Add Income' : 'Add Expense'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-5 pb-20">
        
        {/* Amount */}
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-600 ml-1">Amount</label>
          <div className="relative">
            <input
              autoFocus
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full p-4 pl-12 text-2xl font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
              required
            />
            <IndianRupee className="absolute left-4 top-5 w-6 h-6 text-slate-400" />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-600 ml-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-4 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm appearance-none"
            required
          >
            <option value="" disabled>Select Category</option>
            {categories.map(group => (
              <optgroup key={group.group} label={group.group}>
                {group.items.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Investor Fund Details Section */}
        {isInvestorFund && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ring-2 ring-blue-50">
            <div className="flex items-center gap-2 border-b border-blue-50 pb-3 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Investor Fund Details</h3>
                <p className="text-[10px] text-slate-400">Fill in terms for maturity tracking</p>
              </div>
            </div>
            
            {/* Investor Name */}
            <div className="space-y-1">
              <div className="flex items-center ml-1 mb-1">
                <label className="text-xs font-bold text-slate-500">Investor Name</label>
                <InfoTooltip text="The name of the investor. This creates a separate account ledger to track their principal and interest." />
              </div>
              <input 
                type="text" 
                value={investorName} 
                onChange={e => setInvestorName(e.target.value)}
                list="investor-suggestions"
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-colors"
                placeholder="e.g. John Doe"
                required={isInvestorFund}
                autoComplete="off"
              />
              <datalist id="investor-suggestions">
                {existingInvestors.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <p className="text-[10px] text-emerald-600 pl-1">
                * This name will be added to Expense categories for future interest payments.
              </p>
            </div>

            {/* Purpose */}
            <div className="space-y-1">
              <div className="flex items-center ml-1 mb-1">
                <label className="text-xs font-bold text-slate-500">Purpose</label>
                <InfoTooltip text="Reason for taking this investment (e.g. Construction, Project X)." />
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={purpose} 
                  onChange={e => setPurpose(e.target.value)}
                  className="w-full p-3 pr-8 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-colors"
                  placeholder="e.g. For Galaxy Project Material"
                />
                <Target className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* ROI and Duration Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center ml-1 mb-1">
                  <label className="text-xs font-bold text-slate-500">ROI (%)</label>
                  <InfoTooltip text="Annual Rate of Interest in percentage." />
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    value={roi} 
                    onChange={e => setRoi(e.target.value)}
                    className="w-full p-3 pr-8 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                    placeholder="12"
                    required={isInvestorFund}
                  />
                  <Percent className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center ml-1 mb-1">
                  <label className="text-xs font-bold text-slate-500">Duration (Mo)</label>
                  <InfoTooltip text="The investment period in months." />
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    value={duration} 
                    onChange={e => setDuration(e.target.value)}
                    className="w-full p-3 pr-8 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                    placeholder="36" 
                    required={isInvestorFund}
                  />
                  <Clock className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Return Period */}
            <div className="space-y-1">
                <div className="flex items-center ml-1 mb-1">
                  <label className="text-xs font-bold text-slate-500">Interest Return Period</label>
                  <InfoTooltip text="How frequently the interest is paid out." />
                </div>
                <div className="relative">
                  <select
                    value={returnPeriod}
                    onChange={e => setReturnPeriod(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white appearance-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Maturity">On Maturity</option>
                  </select>
                  <Repeat className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Interest Reminder Calculation */}
            {interestAmount > 0 && (
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-start gap-3 animate-in fade-in">
                 <div className="bg-amber-100 p-1.5 rounded-lg mt-0.5">
                   <BellRing className="w-4 h-4 text-amber-600" />
                 </div>
                 <div className="flex-1">
                   <p className="text-[10px] uppercase font-bold text-amber-600 mb-0.5">Payment Reminder</p>
                   <p className="text-xs text-amber-800 leading-relaxed">
                     You will need to pay <span className="font-bold text-amber-900">{interestAmount.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0})}</span> every <span className="font-bold">{returnPeriod}</span>.
                   </p>
                 </div>
              </div>
            )}

            {/* Prominent Maturity Date Display */}
            {maturityDate && (
              <div className="mt-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between shadow-sm animate-in fade-in">
                <div>
                   <span className="text-xs font-bold text-blue-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                     <CalendarClock className="w-3 h-3" /> Maturity Date
                   </span>
                   <span className="text-lg font-bold text-slate-800">
                      {/* Append time to ensure middle of day to avoid timezone rollover on display */}
                      {new Date(maturityDate + 'T12:00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })}
                   </span>
                </div>
                <div className="text-right">
                   <span className="text-xs font-bold text-slate-400 block">Duration</span>
                   <span className="text-sm font-semibold text-slate-600">{duration} Months</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date & Payment Mode Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600 ml-1">Date</label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              />
              <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600 ml-1">Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            >
              {PAYMENT_MODES.map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-600 ml-1">Note (Optional)</label>
          <div className="relative">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isInvestorFund ? "Principal Return or Interest Payment?" : "Details about transaction..."}
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm resize-none"
            />
            <FileText className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
          </div>
        </div>

        <Button 
          type="submit" 
          fullWidth 
          variant={type === TransactionType.INCOME ? 'income' : 'expense'}
          className="mt-6"
        >
          Save Transaction
        </Button>
      </form>
    </div>
  );
};
