import Message from "../models/Message.js";
import ChatThread from "../models/ChatThread.js";
import MinioService from "./MinioService.js";

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
    const threads = await ChatThread.find({ participants: userId })
      .populate('property', 'title price address')
      .populate('participants', 'firstName lastName email')
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
      { path: 'participants', select: 'firstName lastName email' },
    ]);
  }

  async saveMessage({ roomId, userId, message, image }) {
    const thread = await this.assertThreadAccessByRoom(roomId, userId);

    const msg = await Message.create({
      roomId,
      userId,
      message: message || null,
      image: image || null,
      read: false,
    });

    thread.lastMessageAt = new Date();
    await thread.save();

    return msg.populate("userId", "firstName lastName email");
  }

  async saveImage(imageBuffer, fileName) {
    return MinioService.upload(imageBuffer, fileName);
  }

  async markAsRead(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message introuvable');
    }

    await this.assertThreadAccessByRoom(message.roomId, userId);
    await Message.findByIdAndUpdate(messageId, { read: true });
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
}

export default new ChatService();
