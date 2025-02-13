const request = require("supertest");
const app = require("../index"); // Ensure this is correctly pointing to your Express app
const { db } = require("../src/config/firebase");

// Sample users and test message
const user1 = "testUser1";
const user2 = "testUser2";
const nonFriend = "testUser3"; // A user who is NOT friends with user1
let chatId;
let messageId;
let requestChatId;

describe("Messages API", () => {
  beforeAll(async () => {
    chatId = [user1, user2].sort().join("_"); // Standard chat ID for friends
    requestChatId = [user1, nonFriend].sort().join("_"); // Chat ID for message request

    // Cleanup previous test data
    const batch = db.batch();

    // Clear messages in direct chats
    const messagesSnapshot = await db.collection("chats").doc(chatId).collection("messages").get();
    messagesSnapshot.forEach((doc) => batch.delete(doc.ref));

    // Clear messages in message requests
    const requestMessagesSnapshot = await db.collection("messageRequests").doc(requestChatId).collection("messages").get();
    requestMessagesSnapshot.forEach((doc) => batch.delete(doc.ref));

    // Clear chat metadata
    batch.delete(db.collection("chats").doc(chatId));
    batch.delete(db.collection("messageRequests").doc(requestChatId));

    await batch.commit();
  });

  test("Send a direct message (users are friends)", async () => {
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

  /*** MESSAGE REQUEST TESTS ***/
  test("Send a message request (users are NOT friends)", async () => {
    const response = await request(app)
      .post("/api/messages/send")
      .send({
        senderId: user1,
        receiverId: nonFriend,
        content: "Hello, this is a message request.",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Message request sent!");

    // Verify message is stored in "messageRequests"
    const messagesSnapshot = await db.collection("messageRequests").doc(requestChatId).collection("messages").get();
    expect(messagesSnapshot.empty).toBe(false);
  });

  test("Accept a message request (move to direct chat)", async () => {
    const response = await request(app)
        .post("/api/messages/accept-request")
        .send({
            senderId: user1,
            receiverId: nonFriend,
        });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Message request accepted! You can now chat directly.");

    // Ensure messages were moved to "chats"
    const directChatSnapshot = await db.collection("chats").doc(requestChatId).collection("messages").get();
    expect(directChatSnapshot.empty).toBe(false);

    // Ensure "messageRequests" no longer exists
    const requestChatSnapshot = await db.collection("messageRequests").doc(requestChatId).get();
    expect(requestChatSnapshot.exists).toBe(false);  // This should now pass ✅
});

test("Reject a message request", async () => {
    // Send another request to be rejected
    await db.collection("messageRequests").doc(requestChatId).collection("messages").add({
        senderId: user1,
        receiverId: nonFriend,
        content: "This should be rejected",
        timestamp: new Date(),
    });

    const response = await request(app)
        .delete("/api/messages/reject-request")
        .send({
            senderId: user1,
            receiverId: nonFriend,
        });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Message request rejected!");

    // Ensure the request is completely deleted
    const requestMessagesSnapshot = await db.collection("messageRequests").doc(requestChatId).collection("messages").get();
    expect(requestMessagesSnapshot.empty).toBe(true);  // This should now pass ✅
});

  afterAll(async () => {
    // Cleanup test data after tests
    const batch = db.batch();

    const messagesSnapshot = await db.collection("chats").doc(chatId).collection("messages").get();
    messagesSnapshot.forEach((doc) => batch.delete(doc.ref));

    const requestMessagesSnapshot = await db.collection("messageRequests").doc(requestChatId).collection("messages").get();
    requestMessagesSnapshot.forEach((doc) => batch.delete(doc.ref));

    batch.delete(db.collection("chats").doc(chatId));
    batch.delete(db.collection("messageRequests").doc(requestChatId));

    await batch.commit();
    await db.terminate(); // Close Firebase connection to prevent Jest from hanging
  });
});