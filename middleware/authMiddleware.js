const jwt = require("jsonwebtoken");
const User = require("../models/users");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const cleanToken = token.split(" ")[1];
    const decoded = jwt.verify(cleanToken, "secretkey");

    // ✅ تأكد إن الـ user مش suspended
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    
    if (user.isSuspended) {
      return res.status(403).json({ 
        message: "Your account has been suspended due to: " + (user.suspendReason || "policy violation")
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;