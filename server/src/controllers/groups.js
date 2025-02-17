const { db } = require("../config/firebase");

exports.createGroup = async (req, res) => {
    try {
        const { name, createdBy } = req.body;
        console.log('Creating group:', { name, createdBy }); // Debug log

        const newGroup = {
            name,
            createdBy,
            members: [createdBy],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        console.log('New group data:', newGroup); // Debug log

        const groupRef = await db.collection('groupChats').add(newGroup);
        console.log('Group created with ID:', groupRef.id); // Debug log

        res.status(201).json({
            id: groupRef.id,
            ...newGroup
        });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ message: 'Failed to create group', error: error.message });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const { username } = req.params;
        const groupsRef = await db.collection('groupChats')
            .where('members', 'array-contains', username)
            .get();

        const groups = [];
        groupsRef.forEach(doc => {
            groups.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json(groups);
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ message: 'Failed to fetch groups' });
    }
}; 