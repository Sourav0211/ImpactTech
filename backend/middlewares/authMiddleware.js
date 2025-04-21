import JWT from 'jsonwebtoken';

export const requireSignIn = async (req, res, next) => {
  try {
    // Check if the authorization header is present
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }

    // Verify the token using JWT's verify method
    const decoded = JWT.verify(token, process.env.JWT_SECRET);

    // Attach the user info (from decoded token) to the request object
    req.user = decoded;

    // Call next() to proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
