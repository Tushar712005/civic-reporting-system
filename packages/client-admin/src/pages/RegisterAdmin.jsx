import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function RegisterAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("Public Works Department");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("admin-token");
      const res = await fetch("http://localhost:5000/api/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, password, department }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create admin");
      setSuccess("Admin created successfully.");
      setEmail("");
      setPassword("");
      setDepartment("Public Works Department");
      setTimeout(() => { setSuccess(""); navigate("/dashboard"); }, 1200);
    } catch (err) {
      setError(err.message || "Error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-6 rounded-xl shadow">
        <h2 className="text-2xl font-semibold mb-4">Register Department Admin</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-2 border rounded">
              <option>Public Works Department</option>
              <option>Electricity Department</option>
              <option>Sanitation Department</option>
              <option>Water Supply Department</option>
              <option>General Administration</option>
            </select>
          </div>
          <div>
            <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded">Create Admin</button>
          </div>
        </form>

        {error && <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">{success}</div>}
      </div>
    </div>
  );
}

export default RegisterAdmin;
