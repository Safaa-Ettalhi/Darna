import Notification from '../models/Notification.js';
import EmailService from '../services/EmailService.js';

class NotificationService {
  constructor(io) {
    this.io = io;
    this.emailService = new EmailService();
  }

  async sendNotification({ userId, title, message, type = 'info', email = null }) {
    const notif = await Notification.create({
      userId,
      title,
      message,
      type
    });

    if (this.io) {
      this.io.to(userId.toString()).emit('notification', notif);
    }

    if (email) {
      await this.emailService.sendNotificationEmail(email, title, message, type);
    }

    return notif;
  }

  async getUserNotifications(userId) {
    return Notification.find({ userId }).sort({ createdAt: -1 });
  }

  async markAsRead(notificationId) {
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
  }
}

export default NotificationService;
