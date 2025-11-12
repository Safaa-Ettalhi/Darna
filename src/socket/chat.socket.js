import ChatService from "../services/ChatService.js";
import { socketCheckToken } from "../middlewares/socketMiddleware.js";

export class Chat {
  #io;

  constructor(io) {
    this.#io = io;
  }

  init() {
    this.#io.use(socketCheckToken);

    this.#io.on("connection", (socket) => {
      console.log(`${socket.user.name} connected`);

      socket.on("chat_room", async (data) => {
        try {
          const { roomId } = data;
          await ChatService.assertThreadAccessByRoom(roomId, socket.user.userId);
          socket.join(roomId);
          socket.roomId = roomId;
          console.log(`${socket.user.name} joined room ${roomId}`);

          const messages = await ChatService.getRoomMessages(roomId, socket.user.userId, { limit: 50 });
          socket.emit("previous_messages", messages.reverse());
        } catch (error) {
          console.error('chat_room error', error.message);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("user_typing", () => {
        socket
          .to(socket.roomId)
          .emit("user_typing", `${socket.user.name} is typing...`);
      });

      socket.on("send_message", async (data) => {
        try {
          const newMsg = await ChatService.saveMessage({
            roomId: socket.roomId,
            userId: socket.user.userId,
            message: data.message,
          });

          this.#io.to(socket.roomId).emit("new_message", {
            id: newMsg._id,
            user: `${newMsg.userId.firstName} ${newMsg.userId.lastName}`.trim(),
            message: newMsg.message,
            timestamp: newMsg.createdAt,
          });
        } catch (error) {
          console.error('send_message error', error.message);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("send_image", async (data) => {
        try {
          const fileName = `chat_${Date.now()}.jpg`;
          const imageUrl = await ChatService.saveImage(data.image, fileName);

          const newMsg = await ChatService.saveMessage({
            roomId: socket.roomId,
            userId: socket.user.userId,
            image: imageUrl,
          });

          this.#io.to(socket.roomId).emit("new_image", {
            id: newMsg._id,
            user: `${newMsg.userId.firstName} ${newMsg.userId.lastName}`.trim(),
            image: imageUrl,
            timestamp: newMsg.createdAt,
          });
        } catch (error) {
          console.error('send_image error', error.message);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("message_read", async (data) => {
        try {
          await ChatService.markAsRead(data.messageId, socket.user.userId);
          this.#io.to(socket.roomId).emit("message_read", {
            messageId: data.messageId,
          });
        } catch (error) {
          console.error('message_read error', error.message);
        }
      });

      socket.on("disconnect", () => {
        console.log(`${socket.user.name} disconnected`);
        socket
          .to(socket.roomId)
          .emit("user_disconnected", `${socket.user.name} left the room`);
        socket.leave(socket.roomId);
      });
    });
  }
}
