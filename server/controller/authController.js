import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// NEW: Get User Profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Select everything EXCEPT the password
    const [rows] = await pool.query(
      "SELECT id, username, avatar_seed, total_score, games_played, wins, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// REGISTER LOGIC
export const register = async (req, res) => {
  try {
    const { username, password, avatar } = req.body;

    // FIX: It was pool.quer, changed to pool.query
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      "INSERT INTO users (username , password_hash , avatar_seed)  VALUES (? , ? ,?)",
      [username, hashPassword, avatar],
    );

    const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, {
      expiresIn: "7D",
    });

    res.status(201).json({
      message: "User registered Successfully",
      token,
      user: { id: result.insertId, username, avatar: avatar || "felix" },
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Server Error" });
  }
};

// LOGIN LOGIC
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await pool.query(
      "SELECT * FROM users WHERE username = ? ",
      [username],
    );
    if (users.length == 0)
      return res.status(400).json({ message: "User Not found" });

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid Credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7D",
    });

    res.json({
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar_seed,
        total_score: user.total_score,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};