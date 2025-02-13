const request = require("supertest");
const app = require("../index"); // Ensure this is correctly pointing to your Express app
const { db } = require("../src/config/firebase");

// Sample users for testing
const adminUser = "adminTestUser";
const user1 = "testUser1";
const user2 = "testUser2";
const user3 = "testUser3";

let groupId;
let messageId;

describe("Group Chat API", () => {
    beforeAll(async () => {
        // Clean up old test data
        const groupsSnapshot = await db.collection("groupChats").get();
        const batch = db.batch();
        groupsSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    });

    test("Create a group chat", async () => {
        const response = await request(app)
            .post("/api/group-messages/create")
            .send({
                name: "Test Group",
                createdBy: adminUser,
                users: [adminUser, user1, user2],
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.groupId).toBeDefined();
        expect(response.body.message).toBe("Group chat created!");
        
        groupId = response.body.groupId;
    });

    test("Retrieve group details (Check Initial Admin)", async () => {
        const response = await request(app)
            .get(`/api/group-messages/${groupId}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.groupId).toBe(groupId);
        expect(response.body.admin).toBe(adminUser);
    });

    test("Admin adds a user to the group", async () => {
        const response = await request(app)
            .post("/api/group-messages/add-user")
            .send({
                groupId,
                adminId: adminUser,
                userId: user3,
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("User added to group!");
    });

    test("Non-admin tries to add a user (should fail)", async () => {
        const response = await request(app)
            .post("/api/group-messages/add-user")
            .send({
                groupId,
                adminId: user1, // Not an admin
                userId: user3,
            });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe("Only the admin can add users.");
    });

    test("Send a message to the group", async () => {
        const response = await request(app)
            .post("/api/group-messages/send")
            .send({
                groupId,
                senderId: user1,
                content: "Hello, this is a test message!",
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Message sent to group!");
    });

    test("Retrieve messages from the group chat", async () => {
        const response = await request(app)
            .get(`/api/group-messages/${groupId}/messages`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        messageId = response.body[0].id;
    });

    test("Pin a message in the group", async () => {
        const response = await request(app)
            .put(`/api/group-messages/${groupId}/pin-message`)
            .send({
                adminId: adminUser,
                messageId,
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Message pinned successfully!");
    });

    test("Non-admin tries to pin a message (should fail)", async () => {
        const response = await request(app)
            .put(`/api/group-messages/${groupId}/pin-message`)
            .send({
                adminId: user1,
                messageId,
            });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe("Only the admin can pin messages");
    });

    test("Admin updates group name", async () => {
        const response = await request(app)
            .put(`/api/group-messages/${groupId}/update`)
            .send({
                adminId: adminUser,
                name: "Updated Group Name",
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Group updated successfully!");
    });

    test("Admin assigns a new admin", async () => {
        const response = await request(app)
            .put(`/api/group-messages/${groupId}/update`)
            .send({
                adminId: adminUser,
                newAdmin: user1, // Assigning a new admin
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Group updated successfully!");
    });

    test("Retrieve group details (Verify New Admin)", async () => {
        const response = await request(app)
            .get(`/api/group-messages/${groupId}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.groupId).toBe(groupId);
        expect(response.body.admin).toBe(user1); // Ensure user1 is now the admin
    });

    test("User leaves the group", async () => {
        const response = await request(app)
            .delete("/api/group-messages/leave")
            .send({
                groupId,
                userId: user3,
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("User left the group!");
    });

    test("Admin removes a user from the group", async () => {
        const response = await request(app)
            .delete("/api/group-messages/remove-user")
            .send({
                groupId,
                adminId: user1, // User1 is now the admin
                userId: user2,
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("User removed from group!");
    });

    test("Non-admin tries to remove a user (should fail)", async () => {
        const response = await request(app)
            .delete("/api/group-messages/remove-user")
            .send({
                groupId,
                adminId: user2, // Not an admin anymore
                userId: user1,
            });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe("Only the admin can remove users.");
    });

    test("Admin deletes the group", async () => {
        // Using updated admin (user1) to delete the group
        const response = await request(app)
            .delete("/api/group-messages/delete")
            .send({
                groupId,
                adminId: user1, // Admin changed earlier
            });

        console.log("Delete Group Response:", response.body); // Debugging log
    
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Group deleted successfully!");
    });

    afterAll(async () => {
        // Cleanup Firestore data after tests
        const groupsSnapshot = await db.collection("groupChats").get();
        const batch = db.batch();
        groupsSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Close Firebase connection to prevent Jest from hanging
        await db.terminate();
    });
});