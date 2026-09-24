import React, { useState } from 'react';
import { POSTGRES_DDL, CONCURRENCY_SQL_SNIPPET } from '../data/architectureData';
import { Copy, Check, Download, FileCode, Lock, Terminal } from 'lucide-react';

export const SqlSchemaView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ddl' | 'concurrency'>('ddl');
  const [copied, setCopied] = useState<boolean>(false);

  const activeContent = activeTab === 'ddl' ? POSTGRES_DDL : CONCURRENCY_SQL_SNIPPET;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeContent], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'ddl' ? 'dhaka_tesla_pool_schema.sql' : 'concurrency_reservation.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
              <Terminal className="w-3.5 h-3.5" />
              <span>Production PostgreSQL 16 DDL Script</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Schema DDL & Concurrency Locking SQL
            </h2>
            <p className="mt-2 text-slate-400 text-sm max-w-3xl">
              Production-ready SQL migration script with UUID generation, foreign keys, CHECK constraints,
              indexes, and row-level locking transaction logic for seat race conditions.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied SQL</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-red-900/30"
            >
              <Download className="w-4 h-4" />
              <span>Download .sql</span>
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="mt-6 flex space-x-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('ddl')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition flex items-center space-x-2 ${
              activeTab === 'ddl'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <FileCode className="w-4 h-4 text-sky-400" />
            <span>Full DDL (Tables, Indexes, Constraints)</span>
          </button>
          <button
            onClick={() => setActiveTab('concurrency')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition flex items-center space-x-2 ${
              activeTab === 'concurrency'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Lock className="w-4 h-4 text-red-400" />
            <span>Concurrency Lock: SELECT ... FOR UPDATE</span>
          </button>
        </div>
      </div>

      {/* SQL Editor container */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>{activeTab === 'ddl' ? 'init_dhaka_tesla_pool.sql' : 'concurrency_seat_booking.sql'}</span>
          </div>
          <span>PostgreSQL 16 Dialect</span>
        </div>
        <div className="p-4 sm:p-6 overflow-x-auto max-h-[650px] overflow-y-auto">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed">
            {activeContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
