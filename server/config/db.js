import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config(); // this loads all the environment variable

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});



//this code does nothing but just check if connection is working well
try {
  const connection = await pool.getConnection();
  console.log("✅ MySQL Database Connected Successfully!");
  connection.release();
} catch (error) {
  console.error("❌ MySQL Connection Failed:", error.message);
}

export default pool;