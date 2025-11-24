import Message from "../models/Message.js";
import ChatThread from "../models/ChatThread.js";
import MinioService from "./MinioService.js";
import path from "path";
import { randomUUID } from "crypto";

class ChatService {
  async assertThreadAccessByRoom(roomId, userId) {
    const thread = await ChatThread.findOne({ roomId, participants: userId });
    if (!thread) {
      throw new Error('Accès au canal de discussion refusé');
    }
    return thread;
  }

  async assertThreadAccessById(threadId, userId) {
    const thread = await ChatThread.findOne({ _id: threadId, participants: userId });
    if (!thread) {
      throw new Error('Accès au canal de discussion refusé');
    }
    return thread;
  }

  async getUserThreads(userId) {
    const threads = await ChatThread.find({ 
      participants: userId,
      hiddenFor: { $ne: userId } // Exclure les threads supprimés par cet utilisateur
    })
      .populate('property', 'title price address')
      .populate('participants', 'firstName lastName email phone')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const roomIds = threads.map(({ roomId }) => roomId);
    const lastMessages = await Message.aggregate([
      { $match: { roomId: { $in: roomIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$roomId",
          lastMessage: { $first: "$message" },
          lastImage: { $first: "$image" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ]);
    const messageByRoom = lastMessages.reduce((acc, msg) => {
      acc[msg._id] = msg;
      return acc;
    }, {});

    return threads.map((thread) => ({
      ...thread,
      lastActivity: messageByRoom[thread.roomId]?.createdAt || thread.lastMessageAt,
      lastMessage: messageByRoom[thread.roomId]?.lastMessage || null,
      lastImage: messageByRoom[thread.roomId]?.lastImage || null,
    }));
  }

  async getThreadById(threadId, userId) {
    const thread = await this.assertThreadAccessById(threadId, userId);
    return thread.populate([
      { path: 'property', select: 'title price address' },
      { path: 'participants', select: 'firstName lastName email phone' },
    ]);
  }

  async saveMessage({ roomId, userId, message, image, media }) {
    const thread = await this.assertThreadAccessByRoom(roomId, userId);

    const payload = {
      roomId,
      userId,
      message: message || null,
      image: image || (media?.type === "image" ? media.url : null),
      mediaUrl: media?.url || null,
      mediaType: media?.type || null,
      mediaName: media?.name || null,
      mediaSize: media?.size || null,
      read: false,
    };

    const msg = await Message.create(payload);

    thread.lastMessageAt = new Date();
    await thread.save();

    return msg.populate("userId", "firstName lastName email");
  }

  async saveImage(imageBuffer, fileName, mimeType) {
    const meta = mimeType ? { "Content-Type": mimeType } : {};
    return MinioService.upload(imageBuffer, fileName, meta);
  }

  detectMediaType(mimeType = "", fileName = "") {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    const ext = path.extname(fileName).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) return "image";
    if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) return "video";
    if ([".mp3", ".wav", ".aac", ".ogg"].includes(ext)) return "audio";
    throw new Error("Type de fichier non pris en charge pour le chat");
  }

  async saveMediaMessage({ roomId, userId, buffer, originalName, mimeType, size }) {
    const mediaType = this.detectMediaType(mimeType || "", originalName || "");
    const extension =
      path.extname(originalName || "") ||
      (mimeType ? `.${mimeType.split("/").pop()}` : "");
    const safeExt = extension || "";
    const fileName = `chat_media/${userId}_${Date.now()}_${randomUUID()}${safeExt}`;
    const meta = mimeType ? { "Content-Type": mimeType } : {};
    const url = await MinioService.upload(buffer, fileName, meta);

    return this.saveMessage({
      roomId,
      userId,
      media: {
        url,
        type: mediaType,
        name: originalName || `media${safeExt}`,
        size: size ?? buffer?.length ?? null,
      },
    });
  }

  async markAsRead(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message introuvable');
    }

    await this.assertThreadAccessByRoom(message.roomId, userId);
    const updated = await Message.findByIdAndUpdate(
      messageId,
      { read: true },
      { new: true, lean: true }
    );
    return updated || message.toObject();
  }

  async getRoomMessages(roomId, userId, { limit = 50, before } = {}) {
    await this.assertThreadAccessByRoom(roomId, userId);

    const query = { roomId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    return Message.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getThreadByRoom(roomId) {
    return ChatThread.findOne({ roomId }).populate("participants", "firstName lastName email phone");
  }

  async deleteThread(threadId, userId) {
    const thread = await this.assertThreadAccessById(threadId, userId);
    
    // Ajouter l'utilisateur à la liste hiddenFor au lieu de supprimer physiquement
    // Cela permet de "masquer" la conversation pour cet utilisateur uniquement
    if (!thread.hiddenFor || !thread.hiddenFor.some(id => id.toString() === userId.toString())) {
      await ChatThread.findByIdAndUpdate(threadId, {
        $addToSet: { hiddenFor: userId }
      });
    }
    
    return { success: true };
  }

  async restoreThread(threadId, userId) {
    const thread = await this.assertThreadAccessById(threadId, userId);
    
    // Retirer l'utilisateur de la liste hiddenFor pour restaurer la conversation
    await ChatThread.findByIdAndUpdate(threadId, {
      $pull: { hiddenFor: userId }
    });
    
    return { success: true };
  }
}

export default new ChatService();
