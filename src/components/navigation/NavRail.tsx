'use client';

import React from 'react';
import {
  Compass,
  Dna,
  Radio,
  Route,
  Library,
  Settings,
  Sparkles,
} from 'lucide-react';

export type ActiveTab = 'explore' | 'tastedna' | 'synesthesia' | 'journey' | 'library' | 'settings';

interface NavRailProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isDemoMode: boolean;
}

export function NavRail({ activeTab, onTabChange, isDemoMode }: NavRailProps) {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'explore', label: 'SoundGalaxy', icon: Compass },
    { id: 'tastedna', label: 'TasteDNA', icon: Dna },
    { id: 'synesthesia', label: 'Synesthesia', icon: Radio },
    { id: 'journey', label: 'Journey', icon: Route },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      className="fixed left-0 top-0 bottom-0 w-16 md:w-20 bg-surface/85 backdrop-blur-xl border-r border-border-subtle z-40 flex flex-col items-center justify-between py-5 select-none"
      aria-label="Main Navigation"
    >
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => onTabChange('explore')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-violet/30 to-accent-cyan/30 border border-border-subtle flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_15px_rgba(100,223,255,0.2)]">
          <Sparkles className="w-5 h-5 text-accent-cyan" />
        </div>
        <span className="text-[10px] font-mono tracking-widest uppercase text-text-muted mt-1">
          SONARA
        </span>
      </div>

      {/* Primary Navigation Icons */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative group w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-surface-raised border border-accent-cyan/50 text-accent-cyan shadow-[0_0_15px_rgba(100,223,255,0.25)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised/50 border border-transparent'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-sans font-medium tracking-tight mt-0.5 opacity-80">
                {item.label}
              </span>

              {/* Active Tab Indicator Bar */}
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-accent-cyan shadow-[0_0_8px_#64DFFF]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Mode Status Badge */}
      <div className="flex flex-col items-center px-1">
        <div
          className={`px-2 py-1 rounded-md text-[9px] font-mono uppercase tracking-wider text-center border ${
            isDemoMode
              ? 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber'
              : 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
          }`}
          title={isDemoMode ? 'Operating on deterministic fictional universe data' : 'Connected to user library'}
        >
          {isDemoMode ? 'Demo Universe' : 'Live Mode'}
        </div>
      </div>
    </nav>
  );
}

