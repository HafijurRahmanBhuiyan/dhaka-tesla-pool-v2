import React from 'react';
import { RELATIONSHIPS_LIST } from '../data/architectureData';
import { Network, Link2, ShieldAlert } from 'lucide-react';

export const RelationshipsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
          <Network className="w-3.5 h-3.5" />
          <span>Relational Integrity & Business Logic</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Relationship Explanations (1–2 Lines Each)
        </h2>
        <p className="mt-2 text-slate-400 text-sm max-w-3xl">
          Concise architectural rationales for every inter-table relationship in the Dhaka Tesla Pool MVP,
          describing physical foreign key mappings, cardinality invariants, and concurrency boundary protections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RELATIONSHIPS_LIST.map((rel, index) => (
          <div
            key={index}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition rounded-xl p-5 flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                    {index + 1}
                  </span>
                  <div className="font-mono text-xs font-bold text-white flex items-center space-x-1.5">
                    <span className="text-red-400">{rel.source}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-sky-400">{rel.target}</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-amber-900/30">
                  {rel.type}
                </span>
              </div>

              {/* Foreign Key */}
              <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 mb-3">
                <Link2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-300 truncate">{rel.foreignKey}</span>
              </div>

              {/* 1-2 Line Explanation */}
              <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                {rel.explanation}
              </p>
            </div>

            {/* Business Rule / Constraint */}
            <div className="mt-4 pt-3 border-t border-slate-850 flex items-start space-x-2 text-[11px] text-emerald-400/90 font-mono">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
              <span>{rel.businessRule}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
