
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowLeft, User, ChevronRight, TrendingUp, TrendingDown, Coins, Target, CalendarClock, Banknote, PieChart, Activity } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onBack: () => void;
  onRecordPayment: (investorName: string) => void;
}

interface VirtualTransaction extends Transaction {
  isVirtual?: boolean;
  relatedTransactionId?: string;
}

interface InvestorAccount {
  name: string;
  totalPrincipal: number;
  totalInterestAccrued: number;
  totalPaid: number;
  transactions: VirtualTransaction[];
}

export const InvestorDashboard: React.FC<Props> = ({ transactions, onBack, onRecordPayment }) => {
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorAccount | null>(null);

  // Helper to generate interest entries based on time passed
  const generateInterestEntries = (t: Transaction): VirtualTransaction[] => {
    if (!t.investorDetails || !t.investorDetails.roi) return [];
    
    const entries: VirtualTransaction[] = [];
    const { returnPeriod, maturityDate, periodicInterestAmount } = t.investorDetails;
    const startDate = new Date(t.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // Calculate generic interest amount if not saved
    let interestAmount = periodicInterestAmount || 0;
    if (!interestAmount && t.investorDetails.roi) {
       const annual = (t.amount * t.investorDetails.roi) / 100;
       if (returnPeriod === 'Monthly') interestAmount = annual / 12;
       else if (returnPeriod === 'Quarterly') interestAmount = annual / 4;
       else if (returnPeriod === 'Half-Yearly') interestAmount = annual / 2;
       else if (returnPeriod === 'Yearly') interestAmount = annual;
       else interestAmount = annual * (t.investorDetails.durationMonths / 12); // Maturity
    }

    if (interestAmount <= 0) return [];

    // 1. Maturity Based
    if (returnPeriod === 'Maturity') {
       const mDate = new Date(maturityDate);
       // Only show if maturity date has passed or is today
       if (today >= mDate) {
         entries.push({
           id: `int-${t.id}-maturity`,
           userId: t.userId,
           amount: interestAmount,
           type: TransactionType.EXPENSE, // It's a liability (payable)
           category: 'Interest Due',
           date: maturityDate,
           timestamp: mDate.getTime(),
           note: 'Interest Due on Maturity',
           isVirtual: true,
           relatedTransactionId: t.id
         });
       }
       return entries;
    }

    // 2. Periodic (Monthly, Quarterly, etc.)
    let monthsToAdd = 0;
    if (returnPeriod === 'Monthly') monthsToAdd = 1;
    else if (returnPeriod === 'Quarterly') monthsToAdd = 3;
    else if (returnPeriod === 'Half-Yearly') monthsToAdd = 6;
    else if (returnPeriod === 'Yearly') monthsToAdd = 12;
    
    if (monthsToAdd === 0) return [];

    // Base components for calculation to avoid drift
    const [sY, sM, sD] = t.date.split('-').map(Number); // Use local parts
    
    let multiplier = 1;
    let nextDate = new Date(sY, sM - 1 + (monthsToAdd * multiplier), sD);
    
    // Fix overshoot (e.g. Jan 31 -> Feb 28)
    if (nextDate.getDate() !== sD) {
       nextDate.setDate(0); 
    }

    let count = 1;
    
    // Generate entries up to today
    while (nextDate <= today) {
        entries.push({
            id: `int-${t.id}-${count}`,
            userId: t.userId,
            amount: interestAmount,
            type: TransactionType.EXPENSE, // Liability
            category: 'Interest Due',
            date: nextDate.toISOString().split('T')[0],
            timestamp: nextDate.getTime(),
            note: `Interest Due (${returnPeriod}) #${count}`,
            isVirtual: true,
            relatedTransactionId: t.id
        });
        
        multiplier++;
        // Calculate next date fresh from start date to avoid cumulative drift
        nextDate = new Date(sY, sM - 1 + (monthsToAdd * multiplier), sD);
        if (nextDate.getDate() !== sD) {
            nextDate.setDate(0);
        }
        
        // Stop if we go past maturity date (optional, but good practice if term is fixed)
        if (maturityDate && nextDate > new Date(maturityDate)) break;
        
        count++;
    }

    return entries;
  };

  // Group transactions by investor
  const investorAccounts = useMemo(() => {
    const accounts: Record<string, InvestorAccount> = {};

    // 1. First Pass: Identify Investors and Real Transactions
    transactions.forEach(t => {
      let investorName = '';
      
      // Case 1: Income (Loan Taken)
      if (t.type === TransactionType.INCOME && t.investorDetails?.investorName) {
        investorName = t.investorDetails.investorName;
      } 
      // Case 2: Expense (Payment Made) - check if category matches a known investor or strictly if it's in the group
      else if (t.type === TransactionType.EXPENSE) {
        investorName = t.category; 
      }

      if (!investorName) return;
      const key = investorName.toLowerCase(); 

      if (!accounts[key]) {
        accounts[key] = {
          name: investorName,
          totalPrincipal: 0,
          totalInterestAccrued: 0,
          totalPaid: 0,
          transactions: []
        };
      } else if (t.type === TransactionType.INCOME && t.investorDetails?.investorName) {
         // Prefer the casing from the Income entry
         accounts[key].name = t.investorDetails.investorName;
      }

      // Add Real Transaction
      accounts[key].transactions.push({ ...t, isVirtual: false });

      // Add Amounts
      if (t.type === TransactionType.INCOME && t.investorDetails) {
        accounts[key].totalPrincipal += t.amount;
        
        // GENERATE VIRTUAL INTEREST ENTRIES
        const interestEntries = generateInterestEntries(t);
        interestEntries.forEach(intTx => {
            accounts[key].transactions.push(intTx);
            accounts[key].totalInterestAccrued += intTx.amount;
        });

      } else if (t.type === TransactionType.EXPENSE) {
        accounts[key].totalPaid += t.amount;
      }
    });

    return Object.values(accounts).filter(acc => acc.totalPrincipal > 0 || acc.totalPaid > 0);
  }, [transactions]);

  // Calculate Portfolio Globals
  const portfolioTotals = useMemo(() => {
    return investorAccounts.reduce((acc, curr) => ({
      principal: acc.principal + curr.totalPrincipal,
      interest: acc.interest + curr.totalInterestAccrued,
      paid: acc.paid + curr.totalPaid
    }), { principal: 0, interest: 0, paid: 0 });
  }, [investorAccounts]);

  const totalOutstanding = (portfolioTotals.principal + portfolioTotals.interest) - portfolioTotals.paid;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  };

  if (selectedInvestor) {
    // Re-sort transactions including virtual ones
    const sortedTransactions = [...selectedInvestor.transactions].sort((a,b) => b.timestamp - a.timestamp);
    const netBalance = (selectedInvestor.totalPrincipal + selectedInvestor.totalInterestAccrued) - selectedInvestor.totalPaid;

    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="p-4 bg-white shadow-sm flex items-center gap-4 sticky top-0 z-10">
          <button onClick={() => setSelectedInvestor(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{selectedInvestor.name}</h2>
            <p className="text-xs text-slate-500">Investor Account</p>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4">
          
          {/* Summary Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Principal Taken</p>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(selectedInvestor.totalPrincipal)}</p>
                </div>
                <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Interest Due</p>
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(selectedInvestor.totalInterestAccrued)}</p>
                </div>
             </div>

             <div className="pt-3 border-t border-slate-50 grid grid-cols-2 gap-4 items-center">
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Paid</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(selectedInvestor.totalPaid)}</p>
                 </div>
                 <div className="text-right bg-slate-50 p-2 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Outstanding Balance</p>
                    <p className={`text-xl font-bold ${netBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(netBalance)}
                    </p>
                 </div>
             </div>

             {/* Quick Actions */}
             <div className="pt-2">
                 <button
                   onClick={() => onRecordPayment(selectedInvestor.name)}
                   className="w-full py-3 bg-white border-2 border-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 active:scale-95 transition-all shadow-sm"
                 >
                   <Banknote className="w-5 h-5" />
                   Record Interest Payment
                 </button>
             </div>
          </div>

          <h3 className="font-bold text-slate-700 mt-2 px-1 flex items-center gap-2">
             Passbook <span className="text-xs font-normal text-slate-400">(Includes Interest Due)</span>
          </h3>
          
          <div className="space-y-3 pb-20">
            {sortedTransactions.map(t => (
              <div 
                key={t.id} 
                className={`p-4 rounded-xl border shadow-sm relative overflow-hidden ${
                    t.isVirtual 
                    ? 'bg-amber-50/50 border-amber-100' 
                    : 'bg-white border-slate-100'
                }`}
              >
                {/* Side Color Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    t.isVirtual 
                    ? 'bg-amber-400' 
                    : t.type === TransactionType.INCOME ? 'bg-blue-500' : 'bg-emerald-500'
                }`}></div>
                
                <div className="flex justify-between items-start mb-2">
                   <div>
                      <span className="text-xs font-bold text-slate-400 block mb-0.5">
                        {new Date(t.date).toLocaleDateString()}
                      </span>
                      
                      {t.isVirtual ? (
                         <span className="text-amber-700 font-bold text-sm flex items-center gap-1">
                            <CalendarClock className="w-3.5 h-3.5" /> Interest Due
                         </span>
                      ) : t.type === TransactionType.INCOME ? (
                         <span className="text-blue-700 font-bold text-sm flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> Principal Received
                         </span>
                      ) : (
                         <span className="text-emerald-700 font-bold text-sm flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" /> Payment Sent
                         </span>
                      )}
                   </div>
                   <span className={`font-bold ${
                       t.isVirtual 
                       ? 'text-amber-700' 
                       : t.type === TransactionType.INCOME ? 'text-slate-800' : 'text-emerald-600'
                   }`}>
                      {t.isVirtual ? '+' : ''}{formatCurrency(t.amount)}
                   </span>
                </div>

                {/* Investment Details on Income Transaction */}
                {!t.isVirtual && t.investorDetails && t.type === TransactionType.INCOME && (
                   <div className="text-xs bg-slate-50 p-2 rounded text-slate-600 mt-2 space-y-1">
                      <p><span className="font-semibold">Rate:</span> {t.investorDetails.roi}%</p>
                      <p><span className="font-semibold">Plan:</span> {t.investorDetails.returnPeriod}</p>
                      {t.investorDetails.purpose && (
                        <p className="flex items-center gap-1"><Target className="w-3 h-3"/> {t.investorDetails.purpose}</p>
                      )}
                   </div>
                )}
                
                {t.note && (
                   <div className="text-xs text-slate-400 italic mt-2">
                     "{t.note}"
                   </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white shadow-sm flex items-center gap-4 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Investor Dashboard</h2>
          <p className="text-xs text-slate-500">Overview & Management</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 no-scrollbar">
        
        {/* Portfolio Summary Card */}
        {investorAccounts.length > 0 && (
          <div className="bg-slate-800 rounded-2xl p-5 text-white shadow-xl shadow-slate-200 mb-2">
            <div className="flex items-center gap-2 mb-4 text-slate-300">
               <PieChart className="w-5 h-5 text-blue-400" />
               <h3 className="font-bold text-lg">Portfolio Summary</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
               <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Principal</p>
                  <p className="text-lg font-bold text-white leading-none">{formatCurrency(portfolioTotals.principal)}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wider mb-1">Total Interest</p>
                  <p className="text-lg font-bold text-amber-300 leading-none">{formatCurrency(portfolioTotals.interest)}</p>
               </div>
               <div>
                   <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider mb-1">Total Repaid</p>
                   <p className="text-lg font-bold text-emerald-300 leading-none">{formatCurrency(portfolioTotals.paid)}</p>
               </div>
               <div className="text-right bg-white/10 p-2 rounded-lg -mr-2">
                   <p className="text-[10px] text-slate-300 uppercase font-bold tracking-wider mb-0.5">Net Outstanding</p>
                   <p className="text-xl font-bold text-white leading-none">{formatCurrency(totalOutstanding)}</p>
               </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-1">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
                 <Activity className="w-4 h-4 text-blue-500" />
                 Investor Accounts
             </h3>
             <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{investorAccounts.length}</span>
        </div>

        {investorAccounts.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
             <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
             <p>No investor records found.</p>
             <p className="text-xs mt-2">Add an 'Investor Fund' income to start tracking.</p>
          </div>
        ) : (
          investorAccounts.map(acc => {
              const balance = (acc.totalPrincipal + acc.totalInterestAccrued) - acc.totalPaid;
              return (
                <button 
                  key={acc.name}
                  onClick={() => setSelectedInvestor(acc)}
                  className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.99] transition-transform"
                >
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                         {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                         <p className="font-bold text-slate-800 text-base">{acc.name}</p>
                         <div className="flex gap-2 text-xs text-slate-500">
                             <span>{acc.transactions.filter(t => !t.isVirtual).length} Txns</span>
                             {acc.totalInterestAccrued > 0 && <span className="text-amber-600 font-semibold">• Interest Active</span>}
                         </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Balance</span>
                      <span className={`font-bold text-base ${balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {formatCurrency(balance)}
                      </span>
                   </div>
                   <ChevronRight className="w-5 h-5 text-slate-300 ml-1" />
                </button>
              );
          })
        )}
      </div>
    </div>
  );
};
