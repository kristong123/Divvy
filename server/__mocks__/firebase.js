const firebaseMock = {
    db: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
          set: jest.fn().mockResolvedValue(true),
          update: jest.fn().mockResolvedValue(true),
          delete: jest.fn().mockResolvedValue(true),
          collection: jest.fn(() => ({
            add: jest.fn().mockResolvedValue({ id: 'mockMessageId' }),
            get: jest.fn().mockResolvedValue({ docs: [] })
          }))
        })),
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ docs: [] })
          })),
          get: jest.fn().mockResolvedValue({ docs: [] })
        })),
        add: jest.fn().mockResolvedValue({ id: 'mockMessageId' }),
        orderBy: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ docs: [] })
        }))
      })),
      batch: jest.fn(() => ({
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(true)
      }))
    }
  };
  
  module.exports = firebaseMock;