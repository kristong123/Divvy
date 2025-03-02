export interface Expense {
  id: string;
  name: string;
  amount: number;
  paidBy: string;
  addedBy: string;
  date: string;
}

export interface DebtCalculation {
  debtor: string;
  creditor: string;
  amount: number;
  items: {
    id: string;
    name: string;
    amount: number;
    originalAmount: number;
  }[];
}
