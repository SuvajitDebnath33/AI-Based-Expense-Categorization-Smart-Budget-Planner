import { Link, Route, Routes, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Analytics from "./pages/Analytics";
import Budget from "./pages/Budget";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Navbar />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_1fr]">
        <Sidebar />
        <main className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
            <span>Current page</span>
            <span>{location.pathname}</span>
          </div>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/budget" element={<Budget />} />
          </Routes>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
            <Link className="text-cyan-300 hover:text-cyan-200" to="/">Back to Dashboard</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
