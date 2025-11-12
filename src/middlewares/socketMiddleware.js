import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const socketCheckToken = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Token requis."));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error("Utilisateur non trouvé."));

    const displayName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

    socket.user = {
      userId: user._id.toString(),
      name: displayName,
      email: user.email,
    };

    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Token invalide ou expiré."));
  }
};
