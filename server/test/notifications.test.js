const { db } = require("../src/config/firebase");
const {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  deleteAllNotifications
} = require('../src/controllers/notifications');

// Mock Firebase
jest.mock('../src/config/firebase');

// Mock Socket.IO
jest.mock('../src/config/socket', () => ({
  getIO: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnValue({
      emit: jest.fn()
    })
  })
}));

describe('Notifications Tests', () => {
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

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const mockNotificationRef = {
        id: 'notif123'
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            add: jest.fn().mockResolvedValue(mockNotificationRef)
          })
        })
      }));

      const userId = 'user123';
      const notification = {
        type: 'friend_request',
        message: 'New friend request',
        timestamp: new Date()
      };

      const notificationId = await createNotification(userId, notification);

      expect(notificationId).toBe('notif123');
    });

    it('should handle errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      const userId = 'user123';
      const notification = {
        type: 'friend_request',
        message: 'New friend request'
      };

      await expect(createNotification(userId, notification)).rejects.toThrow('Database error');
    });
  });

  describe('getNotifications', () => {
    it('should get notifications successfully', async () => {
      const mockNotifications = [{
        id: 'notif1',
        data: () => ({
          type: 'friend_request',
          message: 'New friend request',
          timestamp: {
            toDate: () => new Date()
          },
          read: false
        })
      }];

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: mockNotifications
            })
          })
        })
      }));

      req.params.userId = 'user123';
      await getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'friend_request',
            message: 'New friend request'
          })
        ])
      );
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.params.userId = 'user123';
      await getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to get notifications' });
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotificationRef = {
        update: jest.fn().mockResolvedValue(true)
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue(mockNotificationRef)
          })
        })
      }));

      req.params = {
        userId: 'user123',
        notificationId: 'notif123'
      };

      await markNotificationAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification marked as read' });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const mockNotificationRef = {
        delete: jest.fn().mockResolvedValue(true)
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue(mockNotificationRef)
          })
        })
      }));

      req.params = {
        userId: 'user123',
        notificationId: 'notif123'
      };

      await deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification deleted' });
    });
  });

  describe('deleteAllNotifications', () => {
    it('should delete all notifications', async () => {
      const mockBatch = {
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(true)
      };

      const mockNotifications = [{
        ref: { delete: jest.fn() }
      }];

      db.batch.mockReturnValue(mockBatch);
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              docs: mockNotifications,
              forEach: (callback) => mockNotifications.forEach(callback)
            })
          })
        })
      }));

      req.params.userId = 'user123';
      await deleteAllNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'All notifications deleted' });
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.params.userId = 'user123';
      await deleteAllNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to delete notifications' });
    });
  });
}); 