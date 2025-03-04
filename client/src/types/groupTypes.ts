import { Message } from "./messageTypes";

export interface GroupMember {
  username: string;
  profilePicture: string | null;
  isAdmin: boolean;
  venmoUsername?: string;
}

export interface Expense {
  id: string;
  item: string;
  amount: number;
  paidBy: string;
  addedBy: string;
  date?: string;
  splitBetween: string[];
  createdAt?: any;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  expenses: Expense[];
  updatedAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
}

export interface Group {
  id: string;
  name: string;
  imageUrl?: string;
  amount?: string;
  isGroup: true;
  users: GroupMember[];
  admin: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currentEvent?: Event | null;
  messages?: Message[];
  keepEventOpen?: boolean;
}

export interface GroupState {
  groups: { [key: string]: Group };
  messages: { [key: string]: Message[] };
  loading: boolean;
  error: string | null;
}
