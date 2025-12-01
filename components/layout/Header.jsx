// components/layout/Header.jsx
import React from 'react';
import { Search, Bot, Sparkles } from 'lucide-react';

export default function Header({
  activeTab,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  suggestions,
  onSelectSuggestion,
  showSuggestions,
  setShowSuggestions,
  showAI,
  toggleAI,
}) {
  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur z-20">
      <form onSubmit={onSearchSubmit} className="relative w-full max-w-xl">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          type="text"
          className="w-full bg-slate-900 border border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          placeholder={
            activeTab === 'compare'
              ? 'Ajouter au comparateur...'
              : 'Rechercher (ex: Apple)...'
          }
          value={searchQuery}
          onChange={onSearchChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-12 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
            {suggestions.map((s) => (
              <div
                key={s.symbol}
                onMouseDown={() => onSelectSuggestion(s.symbol)}
                className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 flex justify-between items-center group"
              >
                <div>
                  <span className="font-bold text-white group-hover:text-blue-400">
                    {s.symbol}
                  </span>
                  <div className="text-xs text-slate-400 truncate w-48">
                    {s.name}
                  </div>
                </div>
                <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded">
                  {s.exch}
                </span>
              </div>
            ))}
          </div>
        )}
      </form>

      <button
        onClick={toggleAI}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
          showAI
            ? 'bg-purple-600 border-purple-600 text-white'
            : 'border-slate-700 text-slate-400 hover:text-white'
        }`}
      >
        {showAI ? (
          <Sparkles size={18} className="animate-pulse" />
        ) : (
          <Bot size={18} />
        )}
        <span className="hidden md:inline font-medium">Assistant</span>
      </button>
    </header>
  );
}
