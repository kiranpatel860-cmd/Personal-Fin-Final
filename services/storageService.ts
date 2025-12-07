
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
    return JSON.parse(stored);
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
