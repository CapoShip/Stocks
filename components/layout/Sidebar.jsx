// components/layout/Sidebar.jsx
import React from 'react';
import { Activity, BarChart2, Star, Layers, GitCompare } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, setSelectedSector }) {
  const tabs = ['dashboard', 'watchlist', 'sectors', 'compare'];

  return (
    <div className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-30">
      <div className="p-6 text-xl font-bold text-blue-400 flex items-center gap-2">
        <Activity />
        <span className="hidden md:block">CapoStocks</span>
      </div>

      <nav className="flex-1 px-2 space-y-2 mt-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'sectors') setSelectedSector(null);
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {tab === 'dashboard' && <BarChart2 size={20} />}
            {tab === 'watchlist' && <Star size={20} />}
            {tab === 'sectors' && <Layers size={20} />}
            {tab === 'compare' && <GitCompare size={20} />}
            <span className="hidden md:block capitalize">{tab}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
