
import { User, Transaction, TransactionType, GroupedCategory } from '../types';
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from '../constants';

// --- Users ---

export const getUsers = (): User[] => {
  const usersJson = localStorage.getItem(STORAGE_KEYS.USERS);
  return usersJson ? JSON.parse(usersJson) : [];
};

export const saveUser = (name: string): User => {
  const users = getUsers();
  const newUser: User = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now()
  };
  users.push(newUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  return newUser;
};

// --- Transactions ---

export const getTransactions = (userId: string): Transaction[] => {
  const allTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  const parsed: Transaction[] = allTx ? JSON.parse(allTx) : [];
  return parsed.filter(t => t.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
};

export const addTransaction = (transaction: Omit<Transaction, 'id' | 'timestamp'>): Transaction => {
  const allTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  const parsed: Transaction[] = allTx ? JSON.parse(allTx) : [];
  
  const newTx: Transaction = {
    ...transaction,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  };
  
  parsed.push(newTx);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(parsed));
  return newTx;
};

export const updateTransaction = (updatedTx: Transaction): void => {
  const allTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!allTx) return;
  const parsed: Transaction[] = JSON.parse(allTx);
  
  const index = parsed.findIndex(t => t.id === updatedTx.id);
  if (index !== -1) {
    parsed[index] = updatedTx;
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(parsed));
  }
};

export const deleteTransaction = (id: string): void => {
  const allTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!allTx) return;
  const parsed: Transaction[] = JSON.parse(allTx);
  const filtered = parsed.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(filtered));
};

// --- Categories ---

export const getCategories = (): GroupedCategory[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (stored) {
    let categories: GroupedCategory[] = JSON.parse(stored);
    let changed = false;
    
    // --- MIGRATION 1: Ensure 'Investor Funds' is in 'Investor Payments' group ---
    const personalGroup = categories.find(c => c.group === "Personal");
    const investorGroup = categories.find(c => c.group === "Investor Payments");
    
    if (personalGroup && investorGroup) {
      const indexInPersonal = personalGroup.items.indexOf("Investor Funds");
      if (indexInPersonal > -1) {
        personalGroup.items.splice(indexInPersonal, 1);
        if (!investorGroup.items.includes("Investor Funds")) {
          investorGroup.items.unshift("Investor Funds");
        }
        changed = true;
      }
    }

    // --- MIGRATION 2: Create 'Investments' group and move SIPs there ---
    let investmentsGroup = categories.find(c => c.group === "Investments");
    
    if (!investmentsGroup) {
      // Create new group if missing
      investmentsGroup = { group: "Investments", items: ["Mutual Funds", "Stocks"] }; // Default items if created fresh
      // Insert before Personal (usually last)
      const pIndex = categories.findIndex(c => c.group === "Personal");
      if (pIndex > -1) {
        categories.splice(pIndex, 0, investmentsGroup);
      } else {
        categories.push(investmentsGroup);
      }
      changed = true;
    }

    // Move items from Personal to Investments
    if (personalGroup && investmentsGroup) {
      const itemsToMove = ["SIP (Regular)", "SIP (Gold)"];
      
      itemsToMove.forEach(item => {
        const idx = personalGroup.items.indexOf(item);
        if (idx > -1) {
          personalGroup.items.splice(idx, 1); // Remove from Personal
          if (!investmentsGroup!.items.includes(item)) {
            investmentsGroup!.items.unshift(item); // Add to Investments
          }
          changed = true;
        }
      });
    }

    // Save if any migration happened
    if (changed) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    }

    return categories;
  }
  
  // Initialize with default if not found
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
};

export const saveCategories = (categories: GroupedCategory[]): void => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
};

export const resetCategories = (): GroupedCategory[] => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
};

// Automatically add investor name to "Investor Payments" group if it doesn't exist
export const ensureInvestorCategory = (investorName: string): void => {
  const categories = getCategories();
  const groupName = "Investor Payments";
  
  let groupIndex = categories.findIndex(c => c.group === groupName);
  
  // If group doesn't exist (unlikely with new defaults, but safe to check), create it
  if (groupIndex === -1) {
    categories.push({ group: groupName, items: [] });
    groupIndex = categories.length - 1;
  }
  
  // Check if name exists, case insensitive check but store original case
  const exists = categories[groupIndex].items.some(
    item => item.toLowerCase() === investorName.toLowerCase()
  );
  
  if (!exists) {
    categories[groupIndex].items.push(investorName);
    saveCategories(categories);
  }
};
