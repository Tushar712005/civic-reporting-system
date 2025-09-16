import React, { useState } from "react";

function LoginPage({ onLogin }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const url = isRegisterMode ? "http://localhost:5000/api/auth/register" : "http://localhost:5000/api/auth/login";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong");

      if (isRegisterMode) {
        setSuccess("Registration successful! Please log in.");
        setIsRegisterMode(false);
        setEmail("");
        setPassword("");
      } else {
        if (data.token) {
          // Store token and department locally
          localStorage.setItem("admin-token", data.token);
          if (data.department) localStorage.setItem("department", data.department);
          onLogin(data.token);
        } else {
          throw new Error("No token received from server");
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full mx-auto bg-white shadow-lg rounded-xl p-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">{isRegisterMode ? "Create Admin Account" : "Admin Login"}</h2>
          <p className="text-gray-500 mt-2">Access the Civic Issue Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email address</label>
            <div className="mt-1">
              <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="mt-1">
              <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
              {isLoading ? "Processing..." : isRegisterMode ? "Register" : "Sign in"}
            </button>
          </div>
        </form>

        {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">{error}</div>}
        {success && <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center">{success}</div>}

        <div className="mt-6 text-center">
          <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-sm text-blue-600 hover:text-blue-500">
            {isRegisterMode ? "Already have an account? Sign In" : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
