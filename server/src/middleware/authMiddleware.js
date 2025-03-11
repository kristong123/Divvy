const { admin } = require("../config/firebase");

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add the decoded token to the request object
    req.user = {
      uid: decodedToken.uid,
      username: decodedToken.username,
      email: decodedToken.email
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(403).json({ message: "Unauthorized: Invalid token" });
  }
};

module.exports = { authenticateUser };