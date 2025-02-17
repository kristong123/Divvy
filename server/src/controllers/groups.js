const { db } = require("../config/firebase");

exports.createGroup = async (req, res) => {
    try {
        const { name, createdBy } = req.body;

        const newGroup = {
            name,
            createdBy,
            users: [createdBy],
            admin: createdBy,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const groupRef = await db.collection('groupChats').add(newGroup);

        const userDoc = await db.collection("users").doc(createdBy).get();
        const userData = userDoc.data();

        res.status(201).json({
            id: groupRef.id,
            name: newGroup.name,
            admin: createdBy,
            users: [{
                username: createdBy,
                profilePicture: userData?.profilePicture || null,
                isAdmin: true
            }],
            createdBy: createdBy,
            createdAt: newGroup.createdAt,
            updatedAt: newGroup.updatedAt
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create group' });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const { username } = req.params;

        const groupsRef = await db.collection('groupChats')
            .where('users', 'array-contains', username)
            .get();

        const groups = [];
        for (const doc of groupsRef.docs) {
            const groupData = doc.data();

            // Fetch user details for each member
            const userPromises = groupData.users.map(async (username) => {
                const userDoc = await db.collection("users").doc(username).get();
                const userData = userDoc.data();
                return {
                    username,
                    profilePicture: userData?.profilePicture || null,
                    isAdmin: username === groupData.admin
                };
            });

            const users = await Promise.all(userPromises);

            groups.push({
                id: doc.id,
                name: groupData.name,
                isGroup: true,
                admin: groupData.admin,
                users: users,  // Include full user data
                createdBy: groupData.createdBy,
                createdAt: groupData.createdAt,
                updatedAt: groupData.updatedAt
            });
        }

        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch groups' });
    }
}; 