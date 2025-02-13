const request = require("supertest");
const app = require("../index"); // Ensure this is correctly pointing to your Express app
const { db } = require("../src/config/firebase");

// Sample users and test message
const user1 = "testUser1";
const user2 = "testUser2";
let chatId;
let messageId;

describe("Messages API", () => {
  beforeAll(async () => {
    // Ensure chatId follows a consistent format
    chatId = [user1, user2].sort().join("_");

    // Cleanup previous test data
    const messagesSnapshot = await db.collection("chats").doc(chatId).collection("messages").get();
    const batch = db.batch();
    messagesSnapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    await db.collection("chats").doc(chatId).delete();
  });

  test("Send a message", async () => {
    const response = await request(app)
      .post("/api/messages/send")
      .send({
        senderId: user1,
        receiverId: user2,
        content: "Hello, this is a test message.",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Message sent!");

    // Fetch the message to get its ID for later tests
    const messagesSnapshot = await db.collection("chats").doc(chatId).collection("messages").get();
    messageId = messagesSnapshot.docs[0].id;
  });

  test("Get messages from a conversation", async () => {
    const response = await request(app).get(`/api/messages/${chatId}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty("content", "Hello, this is a test message.");
  });

  test("Mark messages as read", async () => {
    const response = await request(app)
      .put(`/api/messages/${chatId}/mark-read`)
      .send({ userId: user2 });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Messages marked as read!");

    // Verify in Firestore
    const messagesSnapshot = await db.collection("chats").doc(chatId).collection("messages").get();
    messagesSnapshot.forEach((doc) => {
      expect(doc.data().readBy.includes(user2)).toBe(true);
    });
  });

  test("Soft delete a message", async () => {
    const response = await request(app)
      .delete(`/api/messages/${chatId}/delete-message`)
      .send({
        chatId,
        messageId,
        userId: user1,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Message deleted!");

    // Verify the message is soft deleted
    const deletedMessage = await db.collection("chats").doc(chatId).collection("messages").doc(messageId).get();
    expect(deletedMessage.data().content).toBe("This message has been deleted.");
    expect(deletedMessage.data().deleted).toBe(true);
  });

  afterAll(async () => {
    // Cleanup test data after tests
    const messagesSnapshot = await db.collection("chats").doc(chatId).collection("messages").get();
    const batch = db.batch();
    messagesSnapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    await db.collection("chats").doc(chatId).delete();
    await db.terminate(); // Close Firebase connection to prevent Jest from hanging
  });
});