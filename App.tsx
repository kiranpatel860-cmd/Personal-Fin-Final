
import React, { useState, useEffect } from 'react';
import { User, Transaction, AppView, TransactionType } from './types';
import { getTransactions, addTransaction, deleteTransaction } from './services/storageService';
import { UserSelection } from './components/UserSelection';
import { Dashboard } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { ReportView } from './components/ReportView';
import { AIView } from './components/AIView';
import { CategorySettings } from './components/CategorySettings';
import { LayoutGrid, PieChart, Sparkles, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.AUTH);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Specific state for the Add Transaction flow to know which type we are adding
  const [txTypeToAdd, setTxTypeToAdd] = useState<TransactionType>(TransactionType.EXPENSE);

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

  const handleSaveTransaction = (data: { amount: number; category: string; paymentMode: string; date: string; note: string }) => {
    if (!currentUser) return;
    addTransaction({
      userId: currentUser.id,
      type: txTypeToAdd,
      ...data
    });
    refreshTransactions();
    setCurrentView(AppView.DASHBOARD);
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
            onSave={handleSaveTransaction}
            onCancel={() => setCurrentView(AppView.DASHBOARD)}
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

      case AppView.DASHBOARD:
      default:
        return (
          <Dashboard 
            transactions={transactions}
            onAddIncome={() => {
              setTxTypeToAdd(TransactionType.INCOME);
              setCurrentView(AppView.ADD_TRANSACTION);
            }}
            onAddExpense={() => {
              setTxTypeToAdd(TransactionType.EXPENSE);
              setCurrentView(AppView.ADD_TRANSACTION);
            }}
            onOpenSettings={() => setCurrentView(AppView.SETTINGS)}
          />
        );
    }
  };

  if (currentView === AppView.AUTH) {
    return renderView();
  }

  // Navigation Bar for Logged In Views (except full screen forms)
  const showNavBar = currentView !== AppView.ADD_TRANSACTION && currentView !== AppView.SETTINGS;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-hidden relative">
        {renderView()}
      </div>

      {showNavBar && (
        <div className="bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setCurrentView(AppView.DASHBOARD)}
            className={`flex flex-col items-center gap-1 ${currentView === AppView.DASHBOARD ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <LayoutGrid className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button 
            onClick={() => setCurrentView(AppView.REPORTS)}
            className={`flex flex-col items-center gap-1 ${currentView === AppView.REPORTS ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <PieChart className="w-6 h-6" />
            <span className="text-[10px] font-bold">Reports</span>
          </button>

          <button 
            onClick={() => setCurrentView(AppView.AI_ASSISTANT)}
            className={`flex flex-col items-center gap-1 ${currentView === AppView.AI_ASSISTANT ? 'text-purple-600' : 'text-slate-400'}`}
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-[10px] font-bold">Insights</span>
          </button>

          <button 
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-red-500"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-bold">Exit</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
