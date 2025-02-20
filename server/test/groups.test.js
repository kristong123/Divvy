const { db } = require("../src/config/firebase");
const { createGroup, getUserGroups } = require('../src/controllers/groups');

// Mock Firebase
jest.mock('../src/config/firebase');

describe('Groups Tests', () => {
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

  describe('createGroup', () => {
    it('should create group successfully', async () => {
      const mockGroupRef = {
        id: 'group123'
      };

      const mockUserDoc = {
        exists: true,
        data: () => ({ profilePicture: 'profile.jpg' })
      };

      db.collection.mockImplementation((collectionName) => ({
        add: jest.fn().mockResolvedValue(mockGroupRef),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUserDoc)
        })
      }));

      req.body = {
        name: 'Test Group',
        createdBy: 'testUser1'
      };

      await createGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 'group123',
        name: 'Test Group',
        admin: 'testUser1'
      }));
    });
  });

  describe('getUserGroups', () => {
    it('should get user groups successfully', async () => {
      const mockGroups = [{
        id: 'group1',
        data: () => ({
          name: 'Test Group',
          admin: 'testUser1',
          users: ['testUser1', 'testUser2'],
          createdBy: 'testUser1',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }];

      const mockUserDoc = {
        exists: true,
        data: () => ({ profilePicture: 'profile.jpg' })
      };

      db.collection.mockImplementation((collectionName) => ({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: mockGroups }),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUserDoc)
        })
      }));

      req.params = { username: 'testUser1' };
      await getUserGroups(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          id: 'group1',
          name: 'Test Group',
          admin: 'testUser1'
        })
      ]));
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.params = { username: 'testUser1' };
      await getUserGroups(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch groups' });
    });
  });
}); 