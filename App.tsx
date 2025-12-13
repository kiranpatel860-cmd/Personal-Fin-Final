
import React, { useState, useEffect } from 'react';
import { User, Transaction, AppView, TransactionType, InvestorDetails } from './types';
import { getTransactions, addTransaction, deleteTransaction, ensureInvestorCategory } from './services/storageService';
import { UserSelection } from './components/UserSelection';
import { Dashboard } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { ReportView } from './components/ReportView';
import { AIView } from './components/AIView';
import { CategorySettings } from './components/CategorySettings';
import { UpcomingMaturities } from './components/UpcomingMaturities';
import { InvestorDashboard } from './components/InvestorDashboard';
import { LayoutGrid, PieChart, Sparkles, LogOut, Users } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.AUTH);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Specific state for the Add Transaction flow to know which type we are adding
  const [txTypeToAdd, setTxTypeToAdd] = useState<TransactionType>(TransactionType.EXPENSE);
  const [txPreFill, setTxPreFill] = useState<{ category?: string, note?: string } | undefined>(undefined);

  useEffect(() => {
    if (currentUser) {
      setTransactions(getTransactions(currentUser.id));
      setCurrentView(AppView.DASHBOARD);
    } else {
      setCurrentView(AppView.AUTH);
    }
  }, [currentUser]);

  const refreshTransactions = () => {
    if (currentUser) {
      setTransactions(getTransactions(currentUser.id));
    }
  };

  const handleUserSelected = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleSaveTransaction = (data: { 
    amount: number; 
    category: string; 
    paymentMode: string; 
    date: string; 
    note: string;
    investorDetails?: InvestorDetails;
  }) => {
    if (!currentUser) return;
    addTransaction({
      userId: currentUser.id,
      type: txTypeToAdd,
      ...data
    });
    refreshTransactions();
    setTxPreFill(undefined);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleRecordPayment = (investorName: string) => {
    ensureInvestorCategory(investorName);
    setTxTypeToAdd(TransactionType.EXPENSE);
    setTxPreFill({ category: investorName, note: 'Interest Payment' });
    setCurrentView(AppView.ADD_TRANSACTION);
  };

  // View Routing
  const renderView = () => {
    switch (currentView) {
      case AppView.AUTH:
        return <UserSelection onUserSelected={handleUserSelected} />;
      
      case AppView.ADD_TRANSACTION:
        return (
          <TransactionForm 
            type={txTypeToAdd}
            initialData={txPreFill}
            onSave={handleSaveTransaction}
            onCancel={() => {
              setTxPreFill(undefined);
              setCurrentView(AppView.DASHBOARD);
            }}
          />
        );
      
      case AppView.REPORTS:
        return (
          <ReportView 
            transactions={transactions} 
            onBack={() => setCurrentView(AppView.DASHBOARD)}
          />
        );

      case AppView.AI_ASSISTANT:
        return (
          <AIView 
            transactions={transactions}
            userName={currentUser?.name || 'User'}
            onBack={() => setCurrentView(AppView.DASHBOARD)}
          />
        );

      case AppView.SETTINGS:
        return (
          <CategorySettings onBack={() => setCurrentView(AppView.DASHBOARD)} />
        );

      case AppView.MATURITIES:
        return (
          <UpcomingMaturities 
            transactions={transactions}
            onBack={() => setCurrentView(AppView.DASHBOARD)}
          />
        );

      case AppView.INVESTOR_DASHBOARD:
        return (
          <InvestorDashboard 
            transactions={transactions}
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            onRecordPayment={handleRecordPayment}
          />
        );

      case AppView.DASHBOARD:
      default:
        return (
          <Dashboard 
            transactions={transactions}
            onAddIncome={() => {
              setTxTypeToAdd(TransactionType.INCOME);
              setTxPreFill(undefined);
              setCurrentView(AppView.ADD_TRANSACTION);
            }}
            onAddExpense={() => {
              setTxTypeToAdd(TransactionType.EXPENSE);
              setTxPreFill(undefined);
              setCurrentView(AppView.ADD_TRANSACTION);
            }}
            onOpenSettings={() => setCurrentView(AppView.SETTINGS)}
            onViewMaturities={() => setCurrentView(AppView.MATURITIES)}
            onViewInvestors={() => setCurrentView(AppView.INVESTOR_DASHBOARD)}
          />
        );
    }
  };

  if (currentView === AppView.AUTH) {
    return renderView();
  }

  // Navigation Bar for Logged In Views (except full screen forms)
  const showNavBar = currentView !== AppView.ADD_TRANSACTION && 
                     currentView !== AppView.SETTINGS && 
                     currentView !== AppView.MATURITIES;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-hidden relative">
        {renderView()}
      </div>

      {showNavBar && (
        <div className="bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setCurrentView(AppView.DASHBOARD)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === AppView.DASHBOARD ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button 
            onClick={() => setCurrentView(AppView.INVESTOR_DASHBOARD)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === AppView.INVESTOR_DASHBOARD ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold">Investors</span>
          </button>

          <button 
            onClick={() => setCurrentView(AppView.REPORTS)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === AppView.REPORTS ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}
          >
            <PieChart className="w-5 h-5" />
            <span className="text-[10px] font-bold">Reports</span>
          </button>

          <button 
            onClick={() => setCurrentView(AppView.AI_ASSISTANT)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === AppView.AI_ASSISTANT ? 'text-purple-600 bg-purple-50' : 'text-slate-400'}`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] font-bold">AI</span>
          </button>

          <button 
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-bold">Exit</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
