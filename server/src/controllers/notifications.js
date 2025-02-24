const { db } = require('../config/firebase');
const { getIO } = require('../config/socket');

const createNotification = async (userId, notification) => {
  try {
    const notificationRef = await db.collection('notifications')
      .doc(userId)
      .collection('items')
      .add({
        ...notification,
        timestamp: new Date(),
        read: false
      });

    const io = getIO();
    io.to(userId).emit('notification', {
      id: notificationRef.id,
      ...notification
    });

    return notificationRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all notifications for the user, ordered by timestamp
    const notificationsSnapshot = await db.collection('notifications')
      .doc(userId)
      .collection('items')
      .orderBy('timestamp', 'desc')
      .limit(50) // Limit to last 50 notifications
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate().toISOString()
    }));

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Failed to get notifications' });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    
    await db.collection('notifications')
      .doc(userId)
      .collection('items')
      .doc(notificationId)
      .update({ 
        read: true,
        readAt: new Date()
      });

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    
    await db.collection('notifications')
      .doc(userId)
      .collection('items')
      .doc(notificationId)
      .delete();

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
};

const deleteAllNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const batch = db.batch();
    const notificationsSnapshot = await db.collection('notifications')
      .doc(userId)
      .collection('items')
      .get();

    notificationsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.status(200).json({ message: 'All notifications deleted' });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ message: 'Failed to delete notifications' });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  deleteAllNotifications
}; 