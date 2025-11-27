import express from "express";
import User from "../model/user.model.js";
import { createToken, verifyToken } from "../auth/jwt.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  const userData = req.body;
  const createdUser = await User.create(userData);

  res.status(201).json({
    createdUser,
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    res.status(404).send("User not found");
  }

  if (!(await user.comparePassword(password))) {
    res.status(400).send("invalid password");
  }

  const token = createToken(user);
  console.log(token);

  res.status(200).json({
    message: "user logged in",
    user,
    token,
  });
});

router.get("/logout", async (req, res) => {
  res.status(200).json({ message: "Logged out" });
});

router.put("/updatePassword", async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    res.status(404).send("User not found.");
  }

  const isMatch = await user.comparePassword(oldPassword);

  if (!isMatch) {
    res.status(400).send("invalid password");
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    message: "password updated",
    user,
  });
});

router.get("/profile/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const user = await User.findOne({ _id: id });

  if (!user) {
    res.status(404).send("User not found");
  }

  res.status(200).json({
    user,
  });
});

export default router;
