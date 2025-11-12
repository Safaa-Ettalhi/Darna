import NotificationService from '../services/NotificationService.js';
import { socketCheckToken } from '../middlewares/socketMiddleware.js';

export class NotificationSocket {
  #io;
  #service;

  constructor(io) {
    this.#io = io;
    this.#service = new NotificationService(io);
  }

  init() {
    this.#io.use(socketCheckToken);

    this.#io.on('connection', (socket) => {
      const userId = socket.user.userId;
      socket.join(userId.toString());

      console.log(`User ${userId} connected to notifications`);

      socket.on('get_notifications', async () => {
        const list = await this.#service.getUserNotifications(userId);
        socket.emit('notifications_list', list);
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
