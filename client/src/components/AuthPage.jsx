import { useState } from "react";
import axios from "axios";

// Different pixel-art avatar styles provided by DiceBear API
const AVATAR_STYLES = ["felix", "aneka", "zorg", "pixel-art", "bottts"];

const AuthPage = ({ onAuthSuccess }) => {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  
  // Controls whether we show the "Login" form or the "Register" form
  const [isLogin, setIsLogin] = useState(true); 
  
  // Stores error messages from the backend (e.g., "Wrong password")
  const [error, setError] = useState("");
  
  // Prevents double-clicking the submit button while waiting for server response
  const [loading, setLoading] = useState(false);

  // Unified state for all input fields
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    avatar: "felix", // Default avatar seed (used only for registration)
  });

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  // Updates state whenever the user types in the input boxes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handles the actual Login / Register process
  const handleSubmit = async (e) => {
    e.preventDefault(); // Stop the page from reloading
    setError(""); // Clear old errors
    setLoading(true); // Disable button

    // Get the backend URL from environment variables (Vite specific)
    const API_URL = import.meta.env.VITE_API_URL;

    // Decide which endpoint to hit based on the mode
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const apiUrl = `${API_URL}${endpoint}`;

    try {
      // Send the request to the server
      const { data } = await axios.post(apiUrl, formData);

      // If successful:
      // 1. Save the JWT Token (so we stay logged in on refresh)
      localStorage.setItem("token", data.token);
      // 2. Save basic user info (ID, name)
      localStorage.setItem("user", JSON.stringify(data.user));

      // 3. Notify the parent component (App.jsx) that we are in!
      onAuthSuccess(data.user);
    } catch (err) {
      // If failed, show the error message from the server
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false); // Re-enable the button
    }
  };

  // --------------------------------------------------------------------------
  // RENDER UI
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-2xl border border-gray-700">
        
        {/* HEADER: Changes based on mode */}
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-500">
          {isLogin ? "Welcome Back!" : "Join DoodleQuest"}
        </h2>

        {/* ERROR ALERT: Only shows if there is an error */}
        {error && (
          <div className="bg-red-500 text-white p-2 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* USERNAME INPUT */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none"
              placeholder="Enter your name"
              required
            />
          </div>

          {/* PASSWORD INPUT */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none"
              placeholder="••••••"
              required
            />
          </div>

          {/* AVATAR SELECTION: Only show this when Registering */}
          {!isLogin && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Choose Avatar
              </label>
              <div className="flex justify-center gap-3">
                {AVATAR_STYLES.map((seed) => (
                  <img
                    key={seed}
                    // Generate avatar URL dynamically
                    src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${seed}`}
                    alt="avatar"
                    // Clicking sets this as the selected avatar
                    onClick={() => setFormData({ ...formData, avatar: seed })}
                    className={`w-12 h-12 rounded-full cursor-pointer border-2 transition ${
                      formData.avatar === seed
                        ? "border-blue-500 scale-110" // Highlight selected one
                        : "border-transparent opacity-50 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON: Changes text based on loading state & mode */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition disabled:opacity-50"
          >
            {loading ? "Processing..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        {/* TOGGLE LINK: Switch between Login and Register */}
        <div className="mt-6 text-center text-sm text-gray-400">
          {isLogin ? "New here? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:underline"
          >
            {isLogin ? "Create Account" : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;