import ChatService from "../services/ChatService.js";
import { socketCheckToken } from "../middlewares/socketMiddleware.js";
import NotificationService from "../services/NotificationService.js";

const serializeRealtimeMessage = (msg) => {
  if (!msg) return null;
  const fullName = `${msg.userId?.firstName || ""} ${msg.userId?.lastName || ""}`.trim();
  const imageUrl = msg.image || (msg.mediaType === "image" ? msg.mediaUrl : null);
  return {
    id: msg._id,
    userId: msg.userId?._id || msg.userId,
    user: fullName || msg.userId?.email || "Utilisateur",
    message: msg.message || null,
    timestamp: msg.createdAt,
    image: imageUrl,
    mediaType: msg.mediaType || null,
    mediaUrl: msg.mediaUrl || null,
    mediaName: msg.mediaName || null,
    mediaSize: msg.mediaSize || null,
    read: msg.read || false,
    systemType: msg.systemType || null,
    callDuration: msg.callDuration || null,
  };
};

export class Chat {
  #io;
  #notificationService;

  constructor(io) {
    this.#io = io;
    this.#notificationService = new NotificationService(io);
  }

  init() {
    this.#io.use(socketCheckToken);

    this.#io.on("connection", (socket) => {
      console.log(`${socket.user.name} connected`);

      // Room personnelle pour recevoir les appels même sans conversation ouverte
      socket.join(socket.user.userId.toString());
      console.log(`${socket.user.name} joined user room ${socket.user.userId}`);

      socket.on("chat_room", async (data) => {
        try {
          const { roomId } = data;
          const thread = await ChatService.assertThreadAccessByRoom(roomId, socket.user.userId);

          socket.join(roomId);
          socket.roomId = roomId;
          console.log(`${socket.user.name} joined room ${roomId}`);

          const messages = await ChatService.getRoomMessages(roomId, socket.user.userId, { limit: 50 });
          socket.emit("previous_messages", messages.reverse());
        } catch (error) {
          console.error("chat_room error", error.message);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("user_typing", () => {
        socket.to(socket.roomId).emit("user_typing", `${socket.user.name} is typing...`);
      });

      socket.on("send_message", async (data) => {
        try {
          const newMsg = await ChatService.saveMessage({
            roomId: socket.roomId,
            userId: socket.user.userId,
            message: data.message,
          });

          const thread = await ChatService.getThreadByRoom(socket.roomId);
          if (!thread) return;

          this.#io.to(socket.roomId).emit("new_message", serializeRealtimeMessage(newMsg));

          if (this.#notificationService) {
            const recipients = thread.participants.filter((participant) => {
              const participantId = participant._id?.toString() || participant.toString();
              const isSender = participantId === socket.user.userId.toString();
              const hasHidden = thread.hiddenFor?.some((hiddenId) => hiddenId.toString() === participantId);
              return !isSender && !hasHidden;
            });

            for (const recipient of recipients) {
              await this.#notificationService.sendNotification({
                userId: recipient._id || recipient,
                title: `Nouveau message sur "${thread.property?.title || "conversation"}"`,
                message: `${newMsg.userId.firstName} ${newMsg.userId.lastName} vous a envoyé un message.`,
                type: "message",
                email: recipient.email,
              });
            }
          }
        } catch (error) {
          console.error("send_message error", error.message);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("send_image", async (data) => {
        try {
          const fileName = `chat_${Date.now()}.jpg`;
          const imageUrl = await ChatService.saveImage(data.image, fileName, "image/jpeg");

          const newMsg = await ChatService.saveMessage({
            roomId: socket.roomId,
            userId: socket.user.userId,
            image: imageUrl,
          });

          this.#io.to(socket.roomId).emit("new_image", serializeRealtimeMessage(newMsg));
        } catch (error) {
          console.error("send_image error", error.message);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("message_read", async (data) => {
        try {
          const updated = await ChatService.markAsRead(data.messageId, socket.user.userId);
          this.#io.to(socket.roomId).emit("message_read", {
            messageId: data.messageId,
            readerId: socket.user.userId,
            readAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error("message_read error", error.message);
        }
      });

      socket.on("call_offer", async (data = {}) => {
        if (!data.offer) {
          console.error("call_offer: missing offer", data);
          return;
        }
        const targetRoomId = data.roomId || socket.roomId;
        if (!targetRoomId) {
          console.error("call_offer: missing roomId", { socketRoomId: socket.roomId, dataRoomId: data.roomId });
          socket.emit("error", { message: "Vous devez être dans une conversation pour appeler." });
          return;
        }

        const thread = await ChatService.getThreadByRoom(targetRoomId);
        if (!thread) {
          console.error("call_offer: thread not found for room", targetRoomId);
          return;
        }

        const recipients = thread.participants.filter((participant) => {
          const participantId = participant._id?.toString() || participant.toString();
          return participantId !== socket.user.userId.toString();
        });

        const callPayload = {
          offer: data.offer,
          threadId: data.threadId,
          roomId: targetRoomId,
          caller: {
            id: socket.user.userId,
            name: socket.user.name || socket.user.email || "Contact",
          },
        };

        console.log(
          `call_offer: emitting to room ${targetRoomId} and user rooms from user ${socket.user.userId} to ${recipients.length} recipients`
        );

        socket.to(targetRoomId).emit("call_offer", callPayload);

        recipients.forEach((participant) => {
          const participantId = participant._id?.toString() || participant.toString();
          this.#io.to(participantId).emit("call_offer", callPayload);
        });
      });

      socket.on("call_answer", (data = {}) => {
        const targetRoomId = data.roomId || socket.roomId;
        if (!targetRoomId || !data.answer) {
          console.error("call_answer: missing roomId or answer", { socketRoomId: socket.roomId, data });
          return;
        }
        socket.to(targetRoomId).emit("call_answer", { answer: data.answer, roomId: targetRoomId });
      });

      socket.on("call_candidate", (data = {}) => {
        const targetRoomId = data.roomId || socket.roomId;
        if (!targetRoomId || !data.candidate) {
          console.error("call_candidate: missing roomId or candidate", { socketRoomId: socket.roomId, data });
          return;
        }
        socket.to(targetRoomId).emit("call_candidate", { candidate: data.candidate, roomId: targetRoomId });
      });

      socket.on("call_decline", (data = {}) => {
        const targetRoomId = data.roomId || socket.roomId;
        if (!targetRoomId) {
          console.error("call_decline: missing roomId", { socketRoomId: socket.roomId, data });
          return;
        }
        socket.to(targetRoomId).emit("call_decline", { ...data, roomId: targetRoomId });
      });

      socket.on("call_end", (data = {}) => {
        const targetRoomId = data.roomId || socket.roomId;
        if (!targetRoomId) {
          console.error("call_end: missing roomId", { socketRoomId: socket.roomId, data });
          return;
        }
        socket.to(targetRoomId).emit("call_end", { ...data, roomId: targetRoomId });
      });

      socket.on("save_call_message", async (data = {}) => {
        try {
          const { roomId, systemType, callDuration } = data;
          if (!roomId || !systemType) {
            console.error("save_call_message: missing roomId or systemType", data);
            return;
          }
          const msg = await ChatService.saveSystemMessage({
            roomId,
            userId: socket.user.userId,
            systemType,
            callDuration: callDuration ?? null,
          });
          const thread = await ChatService.getThreadByRoom(roomId);
          if (!thread) return;

          this.#io.to(roomId).emit("new_message", serializeRealtimeMessage(msg));
        } catch (error) {
          console.error("save_call_message error", error.message);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("disconnect", () => {
        console.log(`${socket.user.name} disconnected`);
        socket.to(socket.roomId).emit("user_disconnected", `${socket.user.name} left the room`);
        socket.leave(socket.roomId);
        if (socket.roomId) {
          socket.to(socket.roomId).emit("call_end", { roomId: socket.roomId });
        }
      });
    });
  }
}
