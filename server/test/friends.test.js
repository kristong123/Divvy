const request = require("supertest");
const app = require("../index");
const { db } = require("../src/config/firebase");  // Change back to using db directly
const { 
  getFriends, 
  addFriend, 
  acceptFriend, 
  declineFriend,
  getPendingRequests,
  getFriendDoc,
  getSentRequests
} = require('../src/controllers/friends');

// Simple mock call, will use the __mocks__ file automatically
jest.mock('../src/config/firebase');

// Mock Express app
jest.mock('../index', () => {
  const express = require('express');
  const app = express();
  
  // Add middleware to parse JSON requests
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  return app;
});

describe('Friends System Tests', () => {
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

  describe('getFriends', () => {
    it('should get friends list successfully', async () => {
      const mockFriendsData = [
        { 
          data: () => ({ users: ['testUser1', 'testUser2'] }),
          id: 'friend1'
        }
      ];
      const mockUserData = { 
        exists: true,
        data: () => ({ profilePicture: 'profile.jpg' })
      };

      db.collection.mockImplementation((collectionName) => ({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: mockFriendsData }),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUserData)
        })
      }));

      req.params.username = 'testUser1';
      await getFriends(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        {
          username: 'testUser2',
          profilePicture: 'profile.jpg'
        }
      ]);
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.params.username = 'testUser1';
      await getFriends(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch friends' });
    });
  });

  describe('addFriend', () => {
    it('should create friend request successfully', async () => {
      const mockUserDoc = {
        exists: true,
        data: () => ({ profilePicture: 'profile.jpg' })
      };
      const mockRequestSnapshot = { empty: true };
      const mockFriendshipDoc = { exists: false };
      const mockRequestRef = { id: 'request123' };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockUserDoc)
            })
          };
        } else if (collectionName === 'friendRequests') {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(mockRequestSnapshot),
            add: jest.fn().mockResolvedValue(mockRequestRef)
          };
        } else if (collectionName === 'friends') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockFriendshipDoc)
            })
          };
        }
      });

      req.body = { user1: 'testUser1', user2: 'testUser2' };
      await addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Friend request sent',
        id: 'request123',
        profilePicture: 'profile.jpg'
      });
    });

    it('should handle duplicate friend requests', async () => {
      const mockUserDoc = {
        exists: true,
        data: () => ({ profilePicture: 'profile.jpg' })
      };
      const mockRequestSnapshot = { empty: false };

      db.collection.mockImplementation((collectionName) => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUserDoc)
        }),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockRequestSnapshot)
      }));

      req.body = { user1: 'testUser1', user2: 'testUser2' };
      await addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Friend request already exists' });
    });

    it('should handle already friends scenario', async () => {
      const mockUserDoc = {
        exists: true,
        data: () => ({ profilePicture: 'profile.jpg' })
      };
      const mockFriendshipDoc = { exists: true };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockUserDoc)
            })
          };
        } else if (collectionName === 'friends') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockFriendshipDoc)
            })
          };
        } else if (collectionName === 'friendRequests') {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true })
          };
        }
        return {};
      });

      req.body = { user1: 'testUser1', user2: 'testUser2' };
      await addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Already friends with this user' });
    });

    it('should handle database errors when adding friend', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.body = { user1: 'testUser1', user2: 'testUser2' };
      await addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to send friend request' });
    });
  });

  describe('acceptFriend', () => {
    it('should accept friend request successfully', async () => {
      const mockRequestDocs = [{
        ref: {
          update: jest.fn().mockResolvedValue(true)
        }
      }];
      const mockSenderDoc = {
        exists: true,
        data: () => ({ profilePicture: 'profile.jpg' })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'friends') {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ 
              empty: false, 
              docs: mockRequestDocs 
            })
          };
        } else if (collectionName === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockSenderDoc)
            })
          };
        }
      });

      req.body = { user1: 'testUser1', user2: 'testUser2' };
      await acceptFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Friend request accepted',
        profilePicture: 'profile.jpg'
      });
    });

    it('should handle non-existent friend request', async () => {
      db.collection.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true })
      }));

      req.body = { user1: 'testUser1', user2: 'testUser2' };
      await acceptFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Friend request not found' });
    });

    it('should handle database errors when accepting friend', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.body = { user1: 'testUser1', user2: 'testUser2' };
      await acceptFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to accept friend request' });
    });
  });

  describe('declineFriend', () => {
    it('should decline friend request successfully', async () => {
      const mockRequestDocs = [{
        ref: {
          delete: jest.fn().mockResolvedValue(true)
        }
      }];

      db.collection.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ 
          empty: false, 
          docs: mockRequestDocs 
        })
      }));

      req.body = { user1: 'testUser1', user2: 'testUser2' };
      await declineFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Friend request declined' });
    });

    it('should handle non-existent friend request when declining', async () => {
      db.collection.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true })
      }));

      req.body = { user1: 'testUser1', user2: 'testUser2' };
      await declineFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Friend request not found' });
    });

    it('should handle database errors when declining', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.body = { user1: 'testUser1', user2: 'testUser2' };
      await declineFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to decline friend request' });
    });
  });

  describe('getPendingRequests', () => {
    it('should get pending requests successfully', async () => {
      const mockRequests = [
        { 
          id: 'req1',
          data: () => ({ 
            sender: 'testUser2',
            recipient: 'testUser1',
            status: 'pending' 
          })
        }
      ];

      db.collection.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: mockRequests })
      }));

      req.params.username = 'testUser1';
      await getPendingRequests(req, res);

      expect(res.json).toHaveBeenCalledWith([{
        id: 'req1',
        sender: 'testUser2',
        recipient: 'testUser1',
        status: 'pending'
      }]);
    });

    it('should handle database errors when getting pending requests', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.params.username = 'testUser1';
      await getPendingRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch pending requests' });
    });
  });

  describe('getFriendDoc helper', () => {
    it('should find friend document successfully', async () => {
      const mockDocs = [{
        id: 'friend123',
        data: () => ({
          users: ['testUser1', 'testUser2'],
          status: 'accepted'
        })
      }];

      db.collection.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          forEach: (callback) => mockDocs.forEach(callback),
          docs: mockDocs
        })
      }));

      const result = await getFriendDoc('testUser1', 'testUser2');
      expect(result.docId).toBe('friend123');
      expect(result.friendDoc).toBeDefined();
    });

    it('should return null when no friend document exists', async () => {
      db.collection.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          forEach: () => {},
          docs: []
        })
      }));

      const result = await getFriendDoc('testUser1', 'testUser2');
      expect(result.docId).toBeNull();
      expect(result.friendDoc).toBeNull();
    });
  });

  describe('getSentRequests', () => {
    it('should get sent requests successfully', async () => {
      const mockRequests = [
        { 
          id: 'req1',
          data: () => ({ 
            sender: 'testUser1',
            recipient: 'testUser2',
            status: 'pending' 
          })
        }
      ];

      db.collection.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: mockRequests })
      }));

      req.params.username = 'testUser1';
      await getSentRequests(req, res);

      expect(res.json).toHaveBeenCalledWith([{
        id: 'req1',
        sender: 'testUser1',
        recipient: 'testUser2',
        status: 'pending'
      }]);
    });

    it('should handle database errors when getting sent requests', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.params.username = 'testUser1';
      await getSentRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch sent requests' });
    });
  });
});