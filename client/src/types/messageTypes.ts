export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: string;
  type?: "group-invite" | "system" | string;
  groupId?: string;
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
