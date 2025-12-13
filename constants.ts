
import { GroupedCategory } from './types';

export const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Indusind (Personal)",
  "Infinity Sol. (Indian Bank)",
  "Om Dev (Indian Bank)",
  "SBI Savings",
  "Tierra Alor (AU Bank)",
  "Credit Card",
  "Other"
];

export const DEFAULT_CATEGORIES: GroupedCategory[] = [
  {
    group: "Real Estate Projects",
    items: [
      "Galaxy",
      "Tatva Developer",
      "Kalpchandra Serenity",
      "Bougainvilla",
      "Varaj Vihar"
    ]
  },
  {
    group: "Investor Payments",
    items: [
      "Investor Funds",
      "Interest Payment",
      "Principal Return"
    ]
  },
  {
    group: "Investments",
    items: [
      "SIP (Regular)",
      "SIP (Gold)",
      "Mutual Funds",
      "Stocks"
    ]
  },
  {
    group: "Personal",
    items: [
      // Income Sources
      "Salary",
      "Business Profit",
      "Rental Income",
      "Interest",
      
      // Insurance
      "Mediclaim",
      "Term Plan",
      "LIC",
      
      // Loans
      "Home Loan",
      "Personal Loan",
      "Friends/Family Loan",
      
      // Daily & Living
      "Utilities",
      "Property Tax",
      "Vehicle",
      "Travel",
      "School Fees",
      "Family Welfare",
      "Groceries",
      "Entertainment",
      "Other"
    ]
  }
];

export const STORAGE_KEYS = {
  USERS: 'wt_users',
  TRANSACTIONS: 'wt_transactions',
  ACTIVE_USER: 'wt_active_user_id',
  CATEGORIES: 'wt_categories'
};
