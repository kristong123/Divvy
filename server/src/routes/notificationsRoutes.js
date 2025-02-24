const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notifications');

router.get('/:userId', getNotifications);
router.put('/:userId/:notificationId/read', markNotificationAsRead);
router.delete('/:userId/:notificationId', deleteNotification);
router.delete('/:userId', deleteAllNotifications);

module.exports = router; 