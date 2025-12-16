
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface InvestorDetails {
  investorName: string;
  roi: number; // Rate of Interest in %
  returnPeriod: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | 'Maturity';
  durationMonths: number;
  maturityDate: string; // ISO String for reminder
  purpose?: string;
  periodicInterestAmount?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMode?: string;
  date: string; // ISO string
  note?: string;
  timestamp: number;
  investorDetails?: InvestorDetails;
  linkedTransactionId?: string;
}

export interface User {
  id: string;
  name: string;
  createdAt: number;
}

export enum AppView {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  ADD_TRANSACTION = 'ADD_TRANSACTION',
  REPORTS = 'REPORTS',
  AI_ASSISTANT = 'AI_ASSISTANT',
  SETTINGS = 'SETTINGS',
  MATURITIES = 'MATURITIES',
  INVESTOR_DASHBOARD = 'INVESTOR_DASHBOARD'
}

export interface GroupedCategory {
  group: string;
  items: string[];
}
