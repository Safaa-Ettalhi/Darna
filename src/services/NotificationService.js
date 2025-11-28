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

    // Sérialiser la notification pour Socket.IO
    const notifData = notif.toObject ? notif.toObject() : {
      _id: notif._id,
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
    };

    if (this.io) {
      const userIdStr = userId?.toString() || userId;
      this.io.to(userIdStr).emit('notification', notifData);
      console.log(`sendNotification: Emitted notification to user ${userIdStr}`);
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

  async sendBulk({ recipients, title, message, type = 'info' }) {
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      console.warn('sendBulk: No recipients provided');
      return [];
    }

    console.log(`sendBulk: Sending ${type} notification to ${recipients.length} recipients`);

    const notifications = [];
    for (const recipient of recipients) {
      try {
        const userId = recipient.userId?.toString() || recipient.userId;
        if (!userId) {
          console.warn('sendBulk: Skipping recipient without userId', recipient);
          continue;
        }

        const notif = await Notification.create({
          userId: recipient.userId,
          title,
          message,
          type,
        });

        console.log(`sendBulk: Created notification ${notif._id} for user ${userId}`);

        // Sérialiser la notification pour Socket.IO
        const notifData = notif.toObject ? notif.toObject() : {
          _id: notif._id,
          userId: notif.userId,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          isRead: notif.isRead,
          createdAt: notif.createdAt,
        };

        // Émettre via Socket.IO si disponible
        if (this.io) {
          // Émettre vers la room personnelle de l'utilisateur
          this.io.to(userId).emit('notification', notifData);
          console.log(`sendBulk: Emitted notification to user room ${userId}`);
        } else {
          console.warn('sendBulk: Socket.IO not available');
        }

        // Envoyer un email si l'email est fourni
        if (recipient.email) {
          try {
            await this.emailService.sendNotificationEmail(recipient.email, title, message, type);
            console.log(`sendBulk: Sent email to ${recipient.email}`);
          } catch (emailError) {
            console.error(`Error sending email to ${recipient.email}:`, emailError);
          }
        }

        notifications.push(notif);
      } catch (error) {
        console.error(`Error creating notification for user ${recipient.userId}:`, error);
      }
    }

    console.log(`sendBulk: Successfully sent ${notifications.length} notifications`);
    return notifications;
  }
}

export default NotificationService;
