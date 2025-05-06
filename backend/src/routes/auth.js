import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import EMOJI from "../constants/emoji.js";

const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Create new user
    const numberOfUsers = await User.count();
    const avatar = EMOJI[numberOfUsers % EMOJI.length];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({
      username,
      password: hashedPassword,
      rank: numberOfUsers + 1,
      avatar,
    });

    // Return user without password
    const userData = {
      id: user.id,
      username: user.username,
      wins: user.wins,
      gamesPlayed: user.gamesPlayed,
      rank: user.rank,
      avatar: user.avatar,
    };
    req.session.user = userData;

    return res.status(201).json({
      message: "User registered successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
});

// Login existing user
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Set session
    const userData = {
      id: user.id,
      username: user.username,
      wins: user.wins,
      gamesPlayed: user.gamesPlayed,
      rank: user.rank,
      avatar: user.avatar,
    };
    req.session.user = userData;

    return res.status(200).json({
      message: "Login successful",
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Could not log out" });
    }
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
});

// Get current user
router.get("/me", (req, res) => {
  if (req.session.user) {
    return res.status(200).json({ user: req.session.user });
  }
  return res.status(401).json({ message: "Not authenticated" });
});

export default router;
