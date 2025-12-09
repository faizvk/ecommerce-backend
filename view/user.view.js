import express from "express";
import mongoose from "mongoose";
import User from "../model/user.model.js";
import AutherizeRole from "../auth/role.middleware.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  verifyRefreshToken,
} from "../auth/auth.middleware.js";

const router = express.Router();

/* ------------------------------------------------------
    SIGNUP
------------------------------------------------------ */
router.post("/signup", async (req, res) => {
  try {
    const userData = req.body;

    if (!userData.email || !userData.password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const existingUser = await User.findOne({ email: userData.email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // ⭐ FIX: allow role assignment (admin or user)
    const newUser = new User({
      ...userData,
      role: userData.role || "user", // <-- IMPORTANT
    });

    const createdUser = await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      success: true,
      user: createdUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Signup failed",
      error: error.message,
    });
  }
});

/* ------------------------------------------------------
    LOGIN
------------------------------------------------------ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

    let user = await User.findOne({ email }).select("+password");

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.comparePassword(password);

    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    // Generate tokens
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: false, // true in production HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Remove password
    user = user.toObject();
    delete user.password;

    res.status(200).json({
      message: "Login successful",
      success: true,
      accessToken,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

/* ------------------------------------------------------
    REFRESH TOKEN
------------------------------------------------------ */
router.post("/refresh", verifyRefreshToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    const newAccessToken = createAccessToken(user);

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(500).json({ message: "Refresh failed" });
  }
});

/* ------------------------------------------------------
    LOGOUT
------------------------------------------------------ */
router.get("/logout", (req, res) => {
  res.clearCookie("refreshToken");

  res.status(200).json({
    message: "Logged out successfully",
    success: true,
  });
});

/* ------------------------------------------------------
    UPDATE PASSWORD
------------------------------------------------------ */
router.put("/updatePassword", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword)
      return res.status(400).json({
        message: "All fields are required",
      });

    const user = await User.findById(userId).select("+password");

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.comparePassword(oldPassword);

    if (!isMatch)
      return res.status(401).json({ message: "Old password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      message: "Password updated successfully",
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Password update failed",
      error: error.message,
    });
  }
});

/* ------------------------------------------------------
    GET PROFILE
------------------------------------------------------ */
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
});

router.get("/all", verifyToken, AutherizeRole("admin"), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.status(200).json({ success: true, users });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// UPDATE USER ROLE
router.put(
  "/updateRole/:id",
  verifyToken,
  AutherizeRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await User.findByIdAndUpdate(id, { role }, { new: true });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ message: "Failed to update role" });
    }
  }
);

export default router;
