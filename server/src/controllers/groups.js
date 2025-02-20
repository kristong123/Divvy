const { db } = require("../config/firebase");

exports.createGroup = async (req, res) => {
    try {
        const { name, createdBy } = req.body;

        // Get creator's full user data including venmoUsername
        const userDoc = await db.collection("users").doc(createdBy).get();
        const userData = userDoc.data();
        console.log('Creator user data:', userData); // Debug log

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

        const response = {
            id: groupRef.id,
            name: newGroup.name,
            admin: createdBy,
            users: [{
                username: createdBy,
                profilePicture: userData?.profilePicture || null,
                venmoUsername: userData?.venmoUsername || null, // Add venmoUsername
                isAdmin: true
            }],
            createdBy: createdBy,
            createdAt: newGroup.createdAt,
            updatedAt: newGroup.updatedAt,
            currentEvent: null,
            isGroup: true
        };

        console.log('Created group response:', response); // Debug log
        res.status(201).json(response);
    } catch (error) {
        console.error('Error creating group:', error);
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
            console.log('Processing group:', doc.id, groupData); // Debug log

            // Fetch user details for each member including venmoUsername
            const userPromises = groupData.users.map(async (username) => {
                const userDoc = await db.collection("users").doc(username).get();
                const userData = userDoc.data();
                console.log('User data for', username, ':', userData); // Debug log
                return {
                    username,
                    profilePicture: userData?.profilePicture || null,
                    venmoUsername: userData?.venmoUsername || null,
                    isAdmin: username === groupData.admin
                };
            });

            const users = await Promise.all(userPromises);
            console.log('Processed users:', users); // Debug log

            const group = {
                id: doc.id,
                ...groupData,
                users,
                currentEvent: groupData.currentEvent || null,
                isGroup: true
            };
            console.log('Final group object:', group); // Debug log
            groups.push(group);
        }

        res.status(200).json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ message: 'Failed to fetch groups' });
    }
}; 