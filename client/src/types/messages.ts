export interface MessageData {
  chatId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  id?: string;
  status: string;
  senderName: string;
  senderProfile: string | null;
}

export interface SocketMessageEvent {
  chatId?: string;
  groupId: string;
  message: MessageData;
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

export interface Message {
  id?: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: string;
  type?: 'group-invite';
  groupId?: string;
  groupName?: string;
  invitedBy?: string;
  senderName: string;
  senderProfile: string | null;
} 