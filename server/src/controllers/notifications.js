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

    // Get notifications from Firestore
    const notificationsSnapshot = await db.collection('users')
      .doc(userId)
      .collection('notifications')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const notifications = [];
    notificationsSnapshot.forEach(doc => {
      notifications.push(doc.data());
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { userId, notificationId } = req.params;

    await db.collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notificationId)
      .update({ read: true });

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

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    const batch = db.batch();
    const notificationsSnapshot = await db.collection('users')
      .doc(userId)
      .collection('notifications')
      .where('read', '==', false)
      .get();

    notificationsSnapshot.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  deleteAllNotifications,
  markAllNotificationsAsRead
}; 