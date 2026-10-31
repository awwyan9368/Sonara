'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, Disc, Radio, Eye } from 'lucide-react';

export function CosmicLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 left-20 z-30 pointer-events-auto">
      {isOpen && (
        <div className="mb-2 p-4 w-72 rounded-2xl bg-surface/95 backdrop-blur-xl border border-border-subtle shadow-2xl space-y-3 text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="font-semibold text-text-primary flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" /> Celestial Legend
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-[11px] text-text-secondary">
            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan shadow-[0_0_6px_#64DFFF] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-text-primary">Stellar Stars (Artists)</p>
                <p className="text-[10px] text-text-muted leading-tight">
                  Size corresponds to library prominence. Spectral color denotes O, A, G, K, M star classification.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-violet shadow-[0_0_6px_#8C6CFF] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-text-primary">Planetary Bodies (Songs)</p>
                <p className="text-[10px] text-text-muted leading-tight">
                  Size corresponds to user listening frequency. Frequently played songs appear larger and more luminous.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-accent-amber mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-text-primary">Planetary Rings</p>
                <p className="text-[10px] text-text-muted leading-tight">
                  Form around high-popularity releases (&gt;65/100 catalog rating).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C8D4E5] shadow-[0_0_6px_#C8D4E5] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-text-primary">Misty Void (Unclassified)</p>
                <p className="text-[10px] text-text-muted leading-tight">
                  Dedicated galaxy for artists with unverified or eclectic genres. Never fabricated.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 hover:bg-surface border border-border-subtle hover:border-accent-cyan text-text-secondary hover:text-text-primary backdrop-blur-md transition-all text-xs font-mono shadow-lg cursor-pointer"
        title="View SoundGalaxy visual and sizing rules"
      >
        <HelpCircle className="w-3.5 h-3.5 text-accent-cyan" />
        <span>Cosmic Legend</span>
        {isOpen ? <ChevronDown className="w-3 h-3 ml-0.5" /> : <ChevronUp className="w-3 h-3 ml-0.5" />}
      </button>
    </div>
  );
}

