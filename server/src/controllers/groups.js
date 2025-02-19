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
            updatedAt: new Date(),
            currentEvent: null
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
            updatedAt: newGroup.updatedAt,
            currentEvent: null
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create group' });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const username = req.params.username;
        const groupsSnapshot = await db.collection('groupChats')
            .where('users', 'array-contains', username)
            .get();

        const groups = [];
        for (const doc of groupsSnapshot.docs) {
            const groupData = doc.data();
            console.log('Raw Firebase data for', doc.id, ':', groupData);

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

            // Include all fields from groupData
            const groupResponse = {
                id: doc.id,
                ...groupData,
                users,
                currentEvent: groupData.currentEvent || null
            };
            console.log('Group response:', groupResponse);
            groups.push(groupResponse);
        }

        console.log('Final groups array:', groups);
        res.status(200).json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ message: 'Failed to fetch groups' });
    }
}; 