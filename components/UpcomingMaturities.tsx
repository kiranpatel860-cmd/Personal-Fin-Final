
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { ArrowLeft, Calendar, Filter, Clock, TrendingUp, Search, Target, Coins, BellRing, CalendarClock } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onBack: () => void;
}

type TimeFilter = '30' | '60' | '90' | 'ALL';
type SortOption = 'DATE_ASC' | 'DATE_DESC' | 'AMOUNT_DESC' | 'NAME_ASC';

interface PaymentEvent {
  id: string;
  type: 'PRINCIPAL' | 'INTEREST';
  date: Date;
  amount: number;
  investorName: string;
  purpose?: string;
  note?: string;
  transactionId: string;
  details: {
    roi?: number;
    period?: string;
    dayCount?: number; // Days until due
  };
}

export const UpcomingMaturities: React.FC<Props> = ({ transactions, onBack }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DATE_ASC');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Generate a flat list of all upcoming events (Maturities AND Interest Payments)
  const allEvents = useMemo(() => {
    const events: PaymentEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine the end date for the window
    const endDate = new Date(today);
    if (timeFilter === 'ALL') {
      endDate.setFullYear(today.getFullYear() + 5); // Look ahead 5 years for "All"
    } else {
      endDate.setDate(today.getDate() + parseInt(timeFilter));
    }

    transactions.forEach(t => {
      if (!t.investorDetails || !t.investorDetails.maturityDate) return;

      const { investorName, purpose, maturityDate, periodicInterestAmount, returnPeriod, roi } = t.investorDetails;

      // 1. Principal Maturity Event
      const mDate = new Date(maturityDate);
      mDate.setHours(0, 0, 0, 0);

      if (mDate >= today && mDate <= endDate) {
        events.push({
          id: `${t.id}-maturity`,
          type: 'PRINCIPAL',
          date: mDate,
          amount: t.amount,
          investorName,
          purpose,
          note: t.note,
          transactionId: t.id,
          details: { roi, period: returnPeriod, dayCount: Math.ceil((mDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) }
        });
      }

      // 2. Periodic Interest Events
      // If there is a periodic interest amount and it's not just "On Maturity"
      if (periodicInterestAmount && returnPeriod && returnPeriod !== 'Maturity') {
        let monthsToAdd = 0;
        if (returnPeriod === 'Monthly') monthsToAdd = 1;
        else if (returnPeriod === 'Quarterly') monthsToAdd = 3;
        else if (returnPeriod === 'Half-Yearly') monthsToAdd = 6;
        else if (returnPeriod === 'Yearly') monthsToAdd = 12;

        if (monthsToAdd > 0) {
           const [sY, sM, sD] = t.date.split('-').map(Number);
           // Calculate the first occurrence
           let multiplier = 1;
           let nextDate = new Date(sY, sM - 1 + (monthsToAdd * multiplier), sD);
           if (nextDate.getDate() !== sD) nextDate.setDate(0); // Fix month overflow

           // Loop to find all occurrences within the window [today, endDate]
           // We limit iterations to prevent infinite loops (e.g. 50 events max per transaction)
           let safetyCounter = 0;
           
           while (safetyCounter < 50) {
              // If we passed the maturity date, stop generating interest events
              if (nextDate > mDate) break;

              // If date is in the future window, add it
              if (nextDate >= today) {
                if (nextDate > endDate) break; // Beyond our filter window

                events.push({
                  id: `${t.id}-interest-${nextDate.getTime()}`,
                  type: 'INTEREST',
                  date: new Date(nextDate),
                  amount: periodicInterestAmount,
                  investorName,
                  purpose,
                  transactionId: t.id,
                  details: { roi, period: returnPeriod, dayCount: Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) }
                });
              } else {
                 // Date is in the past, continue searching for next one
                 // But don't break, because future ones might be in window
              }

              // Advance to next period
              multiplier++;
              nextDate = new Date(sY, sM - 1 + (monthsToAdd * multiplier), sD);
              if (nextDate.getDate() !== sD) nextDate.setDate(0);
              
              safetyCounter++;
           }
        }
      }
    });

    return events;
  }, [transactions, timeFilter]);

  // Filter & Sort
  const displayedEvents = useMemo(() => {
    let result = [...allEvents];

    // Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.investorName.toLowerCase().includes(lower) ||
        e.purpose?.toLowerCase().includes(lower) ||
        (e.type === 'PRINCIPAL' ? 'maturity' : 'interest').includes(lower)
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = a.date.getTime();
      const dateB = b.date.getTime();
      
      switch (sortBy) {
        case 'DATE_ASC': return dateA - dateB;
        case 'DATE_DESC': return dateB - dateA;
        case 'AMOUNT_DESC': return b.amount - a.amount;
        case 'NAME_ASC': return a.investorName.localeCompare(b.investorName);
        default: return 0;
      }
    });

    return result;
  }, [allEvents, searchTerm, sortBy]);

  const getUrgencyColor = (days: number, type: 'PRINCIPAL' | 'INTEREST') => {
    // Base colors
    if (type === 'PRINCIPAL') {
        if (days < 0) return 'bg-red-50 border-red-200 text-red-700';
        if (days <= 30) return 'bg-blue-50 border-blue-200 text-blue-700';
        return 'bg-white border-slate-200 text-slate-700';
    } else {
        if (days < 0) return 'bg-red-50 border-red-200 text-red-700';
        if (days <= 15) return 'bg-amber-50 border-amber-200 text-amber-700';
        return 'bg-white border-slate-200 text-slate-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm z-10 sticky top-0">
        <div className="p-4 flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Payment Calendar</h2>
            <p className="text-xs text-slate-500">
               {allEvents.length} upcoming items
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-3 pt-2 border-t border-slate-100">
               {/* Time Filters */}
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Time Period</label>
                 <div className="flex gap-2 overflow-x-auto no-scrollbar">
                   {(['30', '60', '90', 'ALL'] as TimeFilter[]).map(tf => (
                     <button
                       key={tf}
                       onClick={() => setTimeFilter(tf)}
                       className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                         timeFilter === tf 
                           ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                           : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                       }`}
                     >
                       {tf === 'ALL' ? 'All Future' : `Next ${tf} Days`}
                     </button>
                   ))}
                 </div>
               </div>
               
               {/* Sort Filters */}
               <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Sort By</label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'DATE_ASC', label: 'Date (Soonest)' },
                      { id: 'DATE_DESC', label: 'Date (Latest)' },
                      { id: 'AMOUNT_DESC', label: 'Amount (High-Low)' },
                      { id: 'NAME_ASC', label: 'Name (A-Z)' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id as SortOption)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                          sortBy === opt.id
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                         {opt.label}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 no-scrollbar">
        {displayedEvents.length === 0 ? (
          <div className="text-center py-10 text-slate-400 flex flex-col items-center">
            <Clock className="w-12 h-12 mb-3 opacity-20" />
            <p>No upcoming payments found.</p>
            <p className="text-xs mt-1">Try adjusting filters or adding new investor funds.</p>
          </div>
        ) : (
          displayedEvents.map(e => {
            const urgencyClass = getUrgencyColor(e.details.dayCount || 0, e.type);
            const isPrincipal = e.type === 'PRINCIPAL';
            
            return (
              <div key={e.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden relative ${isPrincipal ? 'border-slate-100' : 'border-amber-100'}`}>
                
                {/* Left Stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPrincipal ? 'bg-blue-500' : 'bg-amber-400'}`}></div>

                <div className="p-4 pl-5">
                   {/* Top Row: Date & Urgency */}
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                          <div className={`text-xs font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit mb-1 ${urgencyClass}`}>
                              <Clock className="w-3 h-3" />
                              {e.details.dayCount! < 0 
                                ? `Overdue ${Math.abs(e.details.dayCount!)} days` 
                                : e.details.dayCount === 0 ? 'Due Today' : `${e.details.dayCount} days left`
                              }
                          </div>
                          <span className="text-xs font-bold text-slate-400">
                             {e.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                      </div>
                      <span className={`text-xl font-bold ${isPrincipal ? 'text-blue-700' : 'text-amber-700'}`}>
                        {formatCurrency(e.amount)}
                      </span>
                   </div>

                   {/* Middle Row: Title & Name */}
                   <div className="mb-3">
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {e.investorName}
                      </h3>
                      <div className="flex items-center gap-2 text-sm font-medium">
                         {isPrincipal ? (
                            <span className="text-blue-600 flex items-center gap-1">
                               <CalendarClock className="w-4 h-4" /> Principal Maturity
                            </span>
                         ) : (
                            <span className="text-amber-600 flex items-center gap-1">
                               <Coins className="w-4 h-4" /> Interest Payment
                            </span>
                         )}
                         {e.purpose && <span className="text-slate-400">• {e.purpose}</span>}
                      </div>
                   </div>

                   {/* Bottom Row: Details */}
                   <div className="flex gap-3 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1">
                         <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                         <span className="font-semibold">{e.details.roi}% ROI</span>
                      </div>
                      <div className="flex items-center gap-1">
                         <Target className="w-3.5 h-3.5 text-blue-400" />
                         <span>{e.details.period}</span>
                      </div>
                      {isPrincipal && (
                          <div className="ml-auto font-bold text-slate-400">Full Return</div>
                      )}
                      {!isPrincipal && (
                          <div className="ml-auto flex items-center gap-1 text-amber-600 font-bold">
                              <BellRing className="w-3 h-3" /> Due Soon
                          </div>
                      )}
                   </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
