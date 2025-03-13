export interface Attachment {
  url: string;
  type: "image" | "file" | "video";
  name?: string;
  size?: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: string;
  type: "text" | "group-invite" | "system" | "image";
  readBy: string[];
  groupId?: string;
  groupName?: string;
  invitedBy?: string;
  attachments?: Attachment;
}

export interface SocketMessageEvent {
  chatId?: string;
  groupId: string;
  message: Message;
}

export interface SocketErrorEvent {
  error: string;
}

export interface UserStatusEvent {
  username: string;
  status: string;
}

export interface FriendRequestEvent {
  id?: string;
  sender: string;
  recipient: string;
  timestamp: string;
  profilePicture?: string | null;
  senderProfile?: string | null;
  recipientProfile?: string | null;
}

export interface Expense {
  id: string;
  itemName: string;
  amount: number;
  addedBy: string;
  date: string;
  debtor?: string;
  splitBetween?: string[];
  _debtor?: string;
  _splitBetween?: string[];
}
