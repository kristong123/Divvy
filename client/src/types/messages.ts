export interface MessageData {
  chatId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  id?: string;
  status: string;
}

export interface SocketMessageEvent {
  chatId: string;
  groupId?: string;
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
  sender: string;
  recipient: string;
  timestamp: string;
} 