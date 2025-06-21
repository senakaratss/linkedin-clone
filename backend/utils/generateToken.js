import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = async (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });
  res.cookie("jwt-linkedin", token, {
    httpOnly: true,
    maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
  });
  return token;
};
