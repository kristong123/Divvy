const { db } = require("../src/config/firebase");
const { 
  sendMessage, 
  getMessages, 
  markMessagesAsRead, 
  deleteMessage,
  acceptMessageRequest,
  rejectMessageRequest
} = require('../src/controllers/messages');

// Mock Firebase
jest.mock('../src/config/firebase');

// Mock Socket.IO
jest.mock('../src/config/socket', () => ({
  getIO: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
  })
}));

describe('Messages Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockMessageRef = {
        id: 'msg123'
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            add: jest.fn().mockResolvedValue(mockMessageRef)
          })
        })
      }));

      req.body = {
        chatId: 'chat123',
        content: 'Hello',
        senderId: 'user1',
        receiverId: 'user2'
      };

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 'msg123',
        content: 'Hello',
        senderId: 'user1',
        receiverId: 'user2'
      }));
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.body = {
        chatId: 'chat123',
        content: 'Hello',
        senderId: 'user1',
        receiverId: 'user2'
      };

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to send message' });
    });
  });

  describe('getMessages', () => {
    it('should get messages successfully', async () => {
      const mockMessages = [{
        id: 'msg1',
        data: () => ({
          content: 'Hello',
          senderId: 'user1',
          receiverId: 'user2',
          timestamp: {
            toDate: () => new Date()
          },
          status: 'sent'
        })
      }];

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: mockMessages })
          })
        })
      }));

      req.params = { chatId: 'chat123' };
      await getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          id: 'msg1',
          content: 'Hello'
        })
      ]));
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.params = { chatId: 'chat123' };
      await getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to get messages' });
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark messages as read successfully', async () => {
      const mockMessages = [{
        data: () => ({
          status: 'sent',
          readBy: []
        }),
        ref: {
          update: jest.fn().mockResolvedValue(true)
        }
      }];

      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(true)
      };

      db.batch.mockReturnValue(mockBatch);
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              empty: false,
              forEach: (callback) => mockMessages.forEach(callback),
              docs: mockMessages
            })
          })
        })
      }));

      req.params = { chatId: 'chat123' };
      req.body = { userId: 'user1' };

      await markMessagesAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Messages marked as read!' });
    });

    it('should handle missing userId', async () => {
      req.params = { chatId: 'chat123' };
      req.body = {}; // Missing userId

      await markMessagesAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User ID is required' });
    });

    it('should handle no unread messages', async () => {
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              empty: true
            })
          })
        })
      }));

      req.params = { chatId: 'chat123' };
      req.body = { userId: 'user1' };

      await markMessagesAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'No unread messages found' });
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.params = { chatId: 'chat123' };
      req.body = { userId: 'user1' };

      await markMessagesAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      const mockMessageDoc = {
        exists: true,
        data: () => ({
          senderId: 'user1'
        }),
        ref: {
          update: jest.fn().mockResolvedValue(true)
        }
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockMessageDoc),
              update: mockMessageDoc.ref.update
            })
          })
        })
      }));

      req.body = {
        chatId: 'chat123',
        messageId: 'msg123',
        userId: 'user1'
      };

      await deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Message deleted!' });
    });

    it('should handle unauthorized deletion', async () => {
      const mockMessageDoc = {
        exists: true,
        data: () => ({
          senderId: 'user1'
        })
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockMessageDoc)
            })
          })
        })
      }));

      req.body = {
        chatId: 'chat123',
        messageId: 'msg123',
        userId: 'user2' // Different user
      };

      await deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'You can only delete your own messages' });
    });

    it('should handle non-existent message', async () => {
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ exists: false })
            })
          })
        })
      }));

      req.body = {
        chatId: 'chat123',
        messageId: 'nonexistent',
        userId: 'user1'
      };

      await deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Message not found' });
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.body = {
        chatId: 'chat123',
        messageId: 'msg123',
        userId: 'user1'
      };

      await deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('acceptMessageRequest', () => {
    it('should accept message request successfully', async () => {
      const mockMessages = [{
        id: 'msg1',
        data: () => ({
          content: 'Hello',
          senderId: 'user1',
          timestamp: new Date()
        }),
        ref: {
          delete: jest.fn().mockResolvedValue(true)
        }
      }];

      const mockBatch = {
        set: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(true)
      };

      const mockDocRef = {
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: mockMessages,
            forEach: (callback) => mockMessages.forEach(callback)
          })
        }),
        delete: jest.fn().mockResolvedValue(true)
      };

      db.batch.mockReturnValue(mockBatch);
      db.collection.mockImplementation((collectionName) => ({
        doc: jest.fn().mockReturnValue(
          collectionName === 'messageRequests' ? mockDocRef : {
            collection: jest.fn().mockReturnValue({
              doc: jest.fn().mockReturnThis()
            })
          }
        )
      }));

      req.body = {
        senderId: 'user1',
        receiverId: 'user2'
      };

      await acceptMessageRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Message request accepted! You can now chat directly.' 
      });
    });

    it('should handle no message request found', async () => {
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              empty: true,
              docs: []
            })
          })
        })
      }));

      req.body = {
        senderId: 'user1',
        receiverId: 'user2'
      };

      await acceptMessageRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'No message request found.' });
    });
  });

  describe('rejectMessageRequest', () => {
    it('should reject message request successfully', async () => {
      const mockMessages = [{
        id: 'msg1',
        ref: { delete: jest.fn() }
      }];

      const mockBatch = {
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(true)
      };

      db.batch.mockReturnValue(mockBatch);
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              empty: false,
              docs: mockMessages,
              forEach: (callback) => mockMessages.forEach(callback)
            })
          }),
          delete: jest.fn().mockResolvedValue(true)
        })
      }));

      req.body = {
        senderId: 'user1',
        receiverId: 'user2'
      };

      await rejectMessageRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Message request rejected!' });
    });

    it('should handle no message request found', async () => {
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              empty: true,
              docs: []
            })
          })
        })
      }));

      req.body = {
        senderId: 'user1',
        receiverId: 'user2'
      };

      await rejectMessageRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'No message request found.' });
    });
  });
}); 