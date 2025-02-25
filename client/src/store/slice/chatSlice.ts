import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id?: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: string;
}

interface ChatState {
  messages: { [chatId: string]: Message[] };
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: {},
  loading: false,
  error: null
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<{ chatId: string; message: Message }>) => {
      const { chatId, message } = action.payload;
      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }
      const messageExists = state.messages[chatId].some(m => m.id === message.id);
      if (!messageExists) {
        state.messages[chatId].push(message);
      }
    },
    setMessages: (state, action: PayloadAction<{ chatId: string; messages: Message[] }>) => {
      state.loading = false;
      const { chatId, messages } = action.payload;
      const uniqueMessages = messages.filter((message, index, self) =>
        index === self.findIndex(m => m.id === message.id)
      );
      state.messages[chatId] = uniqueMessages;
    },
    clearMessages: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      delete state.messages[chatId];
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  }
});

export const { addMessage, setMessages, clearMessages, setLoading } = chatSlice.actions;
export default chatSlice.reducer;