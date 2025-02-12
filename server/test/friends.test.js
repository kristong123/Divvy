const request = require("supertest");
const app = require("../index"); // Ensure this is correctly pointing to your Express app
const { db } = require("../src/config/firebase");

// Sample users
const user1 = "testUser1";
const user2 = "testUser2";

describe("Friends API", () => {
  beforeAll(async () => {
    // Ensure any existing relationship is cleared before tests start
    const docId = [user1, user2].sort().join("_");
    await db.collection("friends").doc(docId).delete();
  });

  test("Send friend request", async () => {
    const response = await request(app)
      .post("/api/friends/send-request")
      .send({ user1, user2 });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Friend request sent!");
  });

  test("Check pending friend requests", async () => {
    const response = await request(app).get(`/api/friends/${user2}/pending-requests`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.pendingRequests)).toBe(true);
    expect(response.body.pendingRequests.some(req => req.sender === user1)).toBe(true);
  });

  test("Accept friend request", async () => {
    const response = await request(app)
      .put("/api/friends/accept-request")
      .send({ user1, user2 });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Friend request accepted!");
  });

  test("Check friends list", async () => {
    const response = await request(app).get(`/api/friends/${user1}/friends`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.friends)).toBe(true);
    expect(response.body.friends).toContain(user2);
  });

  test("Cancel friend request (should fail since already accepted)", async () => {
    const response = await request(app)
      .delete("/api/friends/cancel-request")
      .send({ user1, user2 });

    expect(response.statusCode).toBe(400);
  });

  test("Decline friend request (should fail since already accepted)", async () => {
    const response = await request(app)
      .delete("/api/friends/decline-request")
      .send({ user1, user2 });

    expect(response.statusCode).toBe(400);
  });

  test("Remove friend", async () => {
    const response = await request(app)
      .delete("/api/friends/remove")
      .send({ user1, user2 });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Friend removed successfully!");
  });

  afterAll(async () => {
    // Clean up after tests
    const docId = [user1, user2].sort().join("_");
    await db.collection("friends").doc(docId).delete();

    // Close Firebase connection to prevent Jest from hanging
    await db.terminate();
  });
});