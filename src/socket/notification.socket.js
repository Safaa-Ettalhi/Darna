import NotificationService from '../services/NotificationService.js';
import { socketCheckToken } from '../middlewares/socketMiddleware.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

export class NotificationSocket {
  #io;
  #service;

  constructor(io) {
    this.#io = io;
    this.#service = new NotificationService(io);
  }

  init() {
    this.#io.use(socketCheckToken);

    this.#io.on('connection', async (socket) => {
      const userId = socket.user.userId;
      socket.join(userId.toString());

     
      try {
        const user = await User.findById(userId);
        if (user && user.role === 'admin') {
          socket.join('admin');
          console.log(`Admin ${userId} (${user.email}) joined admin room for notifications`);
          
          // Récupérer immédiatement les notifications non lues pour l'admin
          const unreadNotifications = await Notification.find({ 
            userId: userId, 
            isRead: false 
          }).sort({ createdAt: -1 }).limit(10);
          
          if (unreadNotifications.length > 0) {
            console.log(`📬 Found ${unreadNotifications.length} unread notifications for admin ${userId}`);
            socket.emit('notifications_list', unreadNotifications);
          }
        } else {
          console.log(`User ${userId} is not an admin (role: ${user?.role || 'unknown'})`);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
      }

      console.log(`User ${userId} connected to notifications`);

      socket.on('get_notifications', async () => {
        try {
          const list = await this.#service.getUserNotifications(userId);
          console.log(`get_notifications: Sending ${list.length} notifications to user ${userId}`);
          socket.emit('notifications_list', list);
        } catch (error) {
          console.error(`get_notifications error for user ${userId}:`, error);
        }
      });

      socket.on('mark_notification_read', async ({ id }) => {
        await this.#service.markAsRead(id);
      });

      socket.on('disconnect', () => {
        console.log(` User ${userId} disconnected from notifications`);
      });
    });
  }

  get service() {
    return this.#service;
  }
}
