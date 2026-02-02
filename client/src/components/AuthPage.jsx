import { useState } from "react";
import axios from "axios";

const AVATAR_STYLES = ["felix", "aneka", "zorg", "pixel-art", "bottts"];

const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true); // Toggle Login/Register
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    avatar: "felix", // Default avatar seed
  });

  // Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Vite uses 'import.meta.env' instead of 'process.env'
    const API_URL = import.meta.env.VITE_API_URL;

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const apiUrl = `${API_URL}${endpoint}`;

    try {
      const { data } = await axios.post(apiUrl, formData);

      // Save Token to LocalStorage (Persist Login)
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Tell App.jsx we are logged in
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-2xl border border-gray-700">
        {/* HEADER */}
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-500">
          {isLogin ? "Welcome Back!" : "Join DoodleQuest"}
        </h2>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-red-500 text-white p-2 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* USERNAME */}
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

          {/* PASSWORD */}
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

          {/* AVATAR SELECTION (Only for Register) */}
          {!isLogin && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Choose Avatar
              </label>
              <div className="flex justify-center gap-3">
                {AVATAR_STYLES.map((seed) => (
                  <img
                    key={seed}
                    src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${seed}`}
                    alt="avatar"
                    onClick={() => setFormData({ ...formData, avatar: seed })}
                    className={`w-12 h-12 rounded-full cursor-pointer border-2 transition ${
                      formData.avatar === seed
                        ? "border-blue-500 scale-110"
                        : "border-transparent opacity-50 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition disabled:opacity-50"
          >
            {loading ? "Processing..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        {/* TOGGLE LINK */}
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
