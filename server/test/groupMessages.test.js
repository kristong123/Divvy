const { db } = require("../src/config/firebase");
const { 
  createGroup,
  deleteGroup,
  updateGroupChat,
  addUserToGroup,
  removeUserFromGroup,
  leaveGroup,
  sendGroupMessage,
  getGroupMessages,
  pinGroupMessage,
  getGroupDetails,
  createGroupChat,
  sendGroupInvite,
  joinGroup
} = require('../src/controllers/groupMessages');

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

describe('Group Messages Tests', () => {
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
    it('should create a group successfully', async () => {
      const mockGroupRef = {
        id: 'group123',
        collection: jest.fn().mockReturnValue({
          add: jest.fn().mockResolvedValue(true)
        })
      };

      const mockUserDoc = {
        exists: true,
        data: () => ({ profilePicture: 'profile.jpg' })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'groupChats') {
          return {
            add: jest.fn().mockResolvedValue(mockGroupRef)
          };
        } else if (collectionName === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockUserDoc)
            })
          };
        }
      });

      req.body = {
        name: 'Test Group',
        createdBy: 'testUser1'
      };

      await createGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 'group123',
        name: 'Test Group',
        createdBy: 'testUser1',
        users: [{
          username: 'testUser1',
          profilePicture: 'profile.jpg',
          isAdmin: true
        }]
      });
    });

    it('should handle errors when creating group', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.body = {
        name: 'Test Group',
        createdBy: 'testUser1'
      };

      await createGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to create group' });
    });
  });

  describe('getGroupDetails', () => {
    it('should get group details successfully', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          name: 'Test Group',
          admin: 'testUser1',
          users: ['testUser1', 'testUser2'],
          createdBy: 'testUser1',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      };

      const mockUserDoc = {
        exists: true,
        data: () => ({ profilePicture: 'profile.jpg' })
      };

      db.collection.mockImplementation((collectionName) => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(
            collectionName === 'groupChats' ? mockGroupDoc : mockUserDoc
          )
        })
      }));

      req.params = { groupId: 'group123' };

      await getGroupDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        groupId: 'group123',
        name: 'Test Group',
        admin: 'testUser1'
      }));
    });

    it('should handle non-existent group', async () => {
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false })
        })
      }));

      req.params = { groupId: 'nonexistent' };
      await getGroupDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Group not found' });
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.params = { groupId: 'group123' };
      await getGroupDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('deleteGroup', () => {
    it('should delete group successfully', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'testUser1'
        }),
        ref: {
          delete: jest.fn().mockResolvedValue(true)
        }
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc),
          delete: mockGroupDoc.ref.delete
        })
      }));

      req.body = {
        groupId: 'group123',
        adminId: 'testUser1'
      };

      await deleteGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Group deleted successfully!' });
    });
  });

  describe('sendGroupMessage', () => {
    it('should send message successfully', async () => {
      const timestamp = new Date();
      const mockMessageRef = {
        id: 'msg123',
        get: jest.fn().mockResolvedValue({
          data: () => ({
            content: 'Hello',
            senderId: 'testUser1',
            timestamp: {
              toDate: () => timestamp
            },
            system: false
          })
        })
      };

      const mockGroupRef = {
        exists: true,
        data: () => ({
          users: ['testUser1', 'testUser2']
        }),
        collection: jest.fn().mockReturnValue({
          add: jest.fn().mockResolvedValue(mockMessageRef)
        }),
        update: jest.fn().mockResolvedValue(true)
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupRef),
          collection: mockGroupRef.collection,
          update: mockGroupRef.update
        })
      }));

      req.params = { groupId: 'group123' };
      req.body = {
        content: 'Hello',
        senderId: 'testUser1'
      };

      await sendGroupMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 'msg123',
        content: 'Hello',
        senderId: 'testUser1'
      }));
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.params = { groupId: 'group123' };
      req.body = {
        content: 'Hello',
        senderId: 'testUser1'
      };

      await sendGroupMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to send message' });
    });
  });

  describe('updateGroupChat', () => {
    it('should update group successfully', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'testUser1',
          users: ['testUser1', 'testUser2']
        }),
        ref: {
          update: jest.fn().mockResolvedValue(true)
        }
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc),
          update: mockGroupDoc.ref.update
        })
      }));

      req.params = { groupId: 'group123' };
      req.body = {
        adminId: 'testUser1',
        name: 'Updated Group',
        newAdmin: 'testUser2'
      };

      await updateGroupChat(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Group updated successfully!' });
    });

    it('should handle non-admin update attempt', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'testUser1',
          users: ['testUser1', 'testUser2']
        })
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc)
        })
      }));

      req.params = { groupId: 'group123' };
      req.body = {
        adminId: 'testUser2',
        name: 'Updated Group'
      };

      await updateGroupChat(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Only the admin can update group settings' });
    });
  });

  describe('leaveGroup', () => {
    it('should handle user leaving successfully', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'testUser2',
          users: ['testUser1', 'testUser2']
        }),
        ref: {
          update: jest.fn().mockResolvedValue(true)
        }
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc),
          update: mockGroupDoc.ref.update
        })
      }));

      req.body = {
        groupId: 'group123',
        userId: 'testUser1'
      };

      await leaveGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User left the group!' });
    });

    it('should handle admin leaving and assign new admin', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'testUser1',
          users: ['testUser1', 'testUser2']
        }),
        ref: {
          update: jest.fn().mockResolvedValue(true)
        }
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc),
          update: mockGroupDoc.ref.update
        })
      }));

      req.body = {
        groupId: 'group123',
        userId: 'testUser1'
      };

      await leaveGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User left the group!' });
    });
  });

  describe('pinGroupMessage', () => {
    it('should pin message successfully', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'testUser1'
        }),
        ref: {
          update: jest.fn().mockResolvedValue(true)
        }
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc),
          update: mockGroupDoc.ref.update
        })
      }));

      req.params = { groupId: 'group123' };
      req.body = {
        adminId: 'testUser1',
        messageId: 'msg123'
      };

      await pinGroupMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Message pinned successfully!' });
    });
  });

  describe('getGroupMessages', () => {
    it('should get messages successfully', async () => {
      const mockMessages = [{
        id: 'msg1',
        data: () => ({
          content: 'Hello',
          senderId: 'testUser1',
          timestamp: {
            toDate: () => new Date()
          },
          system: false
        })
      }];

      // Create a mock group document with proper references
      const mockGroupRef = {
        exists: true,
        data: () => ({}),
        ref: {
          collection: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: mockMessages })
          })
        }
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupRef),
          collection: mockGroupRef.ref.collection
        })
      }));

      req.params = { groupId: 'group123' };
      await getGroupMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          id: 'msg1',
          content: 'Hello'
        })
      ]));
    });

    it('should handle non-existent group', async () => {
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false })
        })
      }));

      req.params = { groupId: 'nonexistent' };
      await getGroupMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Group chat not found' });
    });
  });

  describe('removeUserFromGroup', () => {
    it('should remove user successfully', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'testUser1',
          users: ['testUser1', 'testUser2']
        }),
        ref: {
          update: jest.fn().mockResolvedValue(true)
        }
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc),
          update: mockGroupDoc.ref.update
        })
      }));

      req.body = {
        groupId: 'group123',
        adminId: 'testUser1',
        userId: 'testUser2'
      };

      await removeUserFromGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User removed from group!' });
    });

    it('should handle non-admin removal attempt', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'testUser1',
          users: ['testUser1', 'testUser2']
        })
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc)
        })
      }));

      req.body = {
        groupId: 'group123',
        adminId: 'testUser2',
        userId: 'testUser1'
      };

      await removeUserFromGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Only the admin can remove users.' });
    });
  });

  describe('createGroupChat', () => {
    it('should create group chat successfully', async () => {
      const mockGroupRef = {
        id: 'group123',
        collection: jest.fn().mockReturnValue({
          add: jest.fn().mockResolvedValue(true)
        })
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

      await createGroupChat(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 'group123',
        name: 'Test Group'
      }));
    });
  });

  describe('addUserToGroup', () => {
    it('should add user successfully', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'adminUser',
          users: ['adminUser']
        }),
        ref: {
          update: jest.fn().mockResolvedValue(true)
        }
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc),
          update: mockGroupDoc.ref.update
        })
      }));

      req.body = {
        groupId: 'group123',
        adminId: 'adminUser',
        userId: 'newUser'
      };

      await addUserToGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User added to group!' });
    });

    it('should handle missing fields', async () => {
      req.body = {
        groupId: 'group123',
        // Missing adminId and userId
      };

      await addUserToGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing fields' });
    });

    it('should handle non-existent group', async () => {
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false })
        })
      }));

      req.body = {
        groupId: 'nonexistent',
        adminId: 'adminUser',
        userId: 'newUser'
      };

      await addUserToGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Group not found' });
    });

    it('should handle non-admin user', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'adminUser',
          users: ['adminUser']
        })
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc)
        })
      }));

      req.body = {
        groupId: 'group123',
        adminId: 'nonAdmin',
        userId: 'newUser'
      };

      await addUserToGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Only the admin can add users.' });
    });

    it('should handle user already in group', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'adminUser',
          users: ['adminUser', 'existingUser']
        })
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc)
        })
      }));

      req.body = {
        groupId: 'group123',
        adminId: 'adminUser',
        userId: 'existingUser'
      };

      await addUserToGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User is already in the group' });
    });

    it('should handle database errors', async () => {
      db.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.body = {
        groupId: 'group123',
        adminId: 'adminUser',
        userId: 'newUser'
      };

      await addUserToGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('sendGroupInvite', () => {
    it('should send invite successfully', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          name: 'Test Group',
          admin: 'testUser1',
          users: ['testUser1']
        })
      };

      const mockUserDoc = {
        exists: true,
        data: () => ({
          profilePicture: 'profile.jpg'
        })
      };

      db.collection.mockImplementation((collectionName) => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(
            collectionName === 'groupChats' ? mockGroupDoc : mockUserDoc
          )
        })
      }));

      req.body = {
        groupId: 'group123',
        username: 'testUser2'
      };

      await sendGroupInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invite sent successfully' });
    });

    it('should handle non-existent group', async () => {
      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false })
        })
      }));

      req.body = {
        groupId: 'nonexistent',
        username: 'testUser2'
      };

      await sendGroupInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Group not found' });
    });

    it('should handle non-existent user', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          name: 'Test Group',
          admin: 'testUser1'
        })
      };

      db.collection.mockImplementation((collectionName) => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(
            collectionName === 'groupChats' ? mockGroupDoc : { exists: false }
          )
        })
      }));

      req.body = {
        groupId: 'group123',
        username: 'nonexistentUser'
      };

      await sendGroupInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should handle user already in group', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          name: 'Test Group',
          admin: 'testUser1',
          users: ['testUser1', 'testUser2']
        })
      };

      const mockUserDoc = {
        exists: true,
        data: () => ({})
      };

      db.collection.mockImplementation((collectionName) => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(
            collectionName === 'groupChats' ? mockGroupDoc : mockUserDoc
          )
        })
      }));

      req.body = {
        groupId: 'group123',
        username: 'testUser2'
      };

      await sendGroupInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User is already in the group' });
    });
  });

  describe('joinGroup', () => {
    it('should join group successfully', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          name: 'Test Group',
          admin: 'admin1',
          users: ['admin1'],
          createdBy: 'admin1',
          createdAt: new Date(),
          updatedAt: new Date()
        }),
        ref: {
          update: jest.fn().mockResolvedValue(true),
          collection: jest.fn().mockReturnValue({
            add: jest.fn().mockResolvedValue(true)
          })
        }
      };

      const mockUserDoc = {
        exists: true,
        data: () => ({
          profilePicture: 'profile.jpg'
        })
      };

      db.collection.mockImplementation((collectionName) => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(
            collectionName === 'groupChats' ? mockGroupDoc : mockUserDoc
          ),
          update: mockGroupDoc.ref.update,
          collection: mockGroupDoc.ref.collection
        })
      }));

      req.body = {
        groupId: 'group123',
        username: 'testUser2'
      };

      await joinGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Successfully joined group',
        group: expect.objectContaining({
          id: 'group123',
          name: 'Test Group',
          admin: 'admin1'
        })
      }));
    });

    it('should handle user already in group', async () => {
      const mockGroupDoc = {
        exists: true,
        data: () => ({
          admin: 'admin1',
          users: ['admin1', 'testUser2']
        })
      };

      db.collection.mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockGroupDoc)
        })
      }));

      req.body = {
        groupId: 'group123',
        username: 'testUser2'
      };

      await joinGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'You are already a member of this group' 
      });
    });
  });
}); 