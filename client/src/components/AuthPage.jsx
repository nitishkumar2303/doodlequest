import { useState } from "react";
import axios from "axios";

// CONSTANTS
const AVATAR_STYLES = ["felix", "aneka", "zorg", "pixel-art", "bottts"];

const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true); 
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    avatar: "felix",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const API_URL = import.meta.env.VITE_API_URL || "https://doodlequest-dfgy.onrender.com";
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const apiUrl = `${API_URL}${endpoint}`;

    try {
      const { data } = await axios.post(apiUrl, formData);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-['Patrick_Hand']">
      
      {/* SKETCH CARD */}
      <div className="sketch-card w-full max-w-md p-10 pt-12">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-5xl font-bold text-gray-800 transform -rotate-2">
            {isLogin ? "Welcome Back!" : "New Artist?"}
          </h2>
          <p className="text-xl text-gray-500 mt-2">
            {isLogin ? "Grab your pencil ✏️" : "Join the art club 🎨"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-600 p-2 mb-6 text-center font-bold text-lg rotate-1">
            🖍️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-gray-600 text-xl font-bold mb-1">Who are you?</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input-sketch"
              placeholder="Your Name"
              required
            />
          </div>

          <div>
            <label className="block text-gray-600 text-xl font-bold mb-1">Secret Code</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-sketch"
              placeholder="Password"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-gray-600 text-xl font-bold mb-3">Pick a Face</label>
              <div className="flex justify-center gap-2 flex-wrap border-2 border-dashed border-gray-300 p-4 rounded-lg">
                {AVATAR_STYLES.map((seed) => (
                  <img
                    key={seed}
                    src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${seed}`}
                    alt="avatar"
                    onClick={() => setFormData({ ...formData, avatar: seed })}
                    className={`w-14 h-14 cursor-pointer transition-transform hover:rotate-6 hover:scale-110 ${
                      formData.avatar === seed
                        ? "border-4 border-blue-400 rounded-full bg-blue-50"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-sketch-primary w-full mt-4 text-2xl">
            {loading ? "Sketching..." : isLogin ? "Enter Studio 🚪" : "Sign Me Up! 📝"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-gray-400 text-lg hover:text-blue-500 hover:underline decoration-wavy underline-offset-4"
          >
            {isLogin ? "Need a pass? Register" : "Have a pass? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;