import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

const selectChatState = (state: RootState) => state.chat.messages;
const selectFriendsState = (state: RootState) => state.friends.friends;

export const selectChatMessages = createSelector(
  [selectChatState, (_: RootState, chatId: string) => chatId],
  (messages, chatId) => messages[chatId] || []
);

export const selectFriend = createSelector(
  [selectFriendsState, (_: RootState, username: string) => username],
  (friends, username) => friends.find(f => f.username === username)
);

// Export a default object with all selectors
const chatSelectors = {
  selectChatMessages,
  selectFriend,
};

export default chatSelectors; 