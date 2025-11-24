import mongoose from "mongoose";

const ALLOWED_MEDIA_TYPES = ["image", "video", "audio"];

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, default: null },
  image: { type: String, default: null },
  mediaUrl: { type: String, default: null },
  mediaType: { type: String, enum: [...ALLOWED_MEDIA_TYPES, null], default: null },
  mediaName: { type: String, default: null },
  mediaSize: { type: Number, default: null },
  systemType: {
    type: String,
    enum: ["call_started", "call_missed", "call_declined", "call_accepted", "call_ended", null],
    default: null,
  },
  callDuration: { type: Number, default: null },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Message", messageSchema);
