import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { BASE_URL } from '../../config/api';

interface Message {
  id?: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: string;
  readBy?: string[];
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

// AsyncThunk for fetching chat messages
export const fetchChatMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (chatId: string) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/messages/${chatId}`);
      return { chatId, messages: response.data };
    } catch (error) {
      console.error(`Failed to load messages for chat ${chatId}:`, error);
      throw error;
    }
  }
);

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
    },
    updateMessageReadStatus: (state, action: PayloadAction<{
      chatId: string;
      messageId: string;
      readBy: string[];
    }>) => {
      const { chatId, messageId, readBy } = action.payload;
      if (state.messages[chatId]) {
        const message = state.messages[chatId].find(m => m.id === messageId);
        if (message) {
          message.readBy = readBy;
          message.status = 'read';
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { chatId, messages } = action.payload;
        const uniqueMessages = messages.filter((message: Message, index: number, self: Message[]) =>
          index === self.findIndex((m: Message) => m.id === message.id)
        );
        state.messages[chatId] = uniqueMessages;
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch messages';
      });
  }
});

export const { addMessage, setMessages, clearMessages, setLoading, updateMessageReadStatus } = chatSlice.actions;
export default chatSlice.reducer;