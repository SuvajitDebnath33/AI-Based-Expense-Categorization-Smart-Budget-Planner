import { NavLink } from "react-router-dom";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/upload", label: "Upload Page" },
  { to: "/analytics", label: "Analytics" },
  { to: "/budget", label: "Budget" },
];

export default function Sidebar() {
  return (
    <aside className="card h-fit">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Navigation</h2>
      <nav className="space-y-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm transition ${
                isActive ? "bg-cyan-500/20 text-cyan-300" : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
