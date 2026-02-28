export default function Navbar() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
        <h1 className="text-lg font-bold text-cyan-300">AI Expense Categorization Platform</h1>
        <span className="rounded-md border border-cyan-700 px-3 py-1 text-xs text-cyan-200">Fintech MVP</span>
      </div>
    </header>
  );
}
