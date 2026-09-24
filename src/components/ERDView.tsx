import React, { useState } from 'react';
import { ERD_MERMAID, SCHEMA_TABLES } from '../data/architectureData';
import { MermaidViewer } from './MermaidViewer';
import { SchemaTable } from '../types';
import { Database, Key, Shield, Hash, ArrowRight, CheckCircle2, Search } from 'lucide-react';

export const ERDView: React.FC = () => {
  const [selectedTableId, setSelectedTableId] = useState<string>('pools');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredTables = SCHEMA_TABLES.filter((table) => {
    const matchesSearch =
      table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || table.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeTable = SCHEMA_TABLES.find((t) => t.id === selectedTableId) || SCHEMA_TABLES[0];

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold mb-3">
              <Database className="w-3.5 h-3.5" />
              <span>Relational Schema & Entity-Relationship Model</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Entity-Relationship Diagram (ERD)
            </h2>
            <p className="mt-2 text-slate-400 text-sm max-w-3xl">
              Complete relational model for the Dhaka Tesla Pool MVP with 9 normalized tables:
              <span className="text-slate-200 font-mono text-xs ml-1">users, vehicles, ride_requests, pools, pool_members, ride_status_history, fares, payments, ratings</span>.
              Strict foreign key constraints, partial B-Tree indexes, and seat capacity invariants.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>9 Tables • 10 Relationships • PostgreSQL 16</span>
          </div>
        </div>
      </div>

      {/* Mermaid ERD Viewer */}
      <MermaidViewer
        id="erd-diagram"
        title="Entity-Relationship Diagram (ERD) - Mermaid Representation"
        chart={ERD_MERMAID}
      />

      {/* Table Explorer & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Table List Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search tables or columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1 mb-3">
              {['all', 'core', 'ride', 'billing', 'audit'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium capitalize transition ${
                    categoryFilter === cat
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Table Item Buttons */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredTables.map((table) => {
                const isSelected = table.id === selectedTableId;
                return (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTableId(table.id)}
                    className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between group ${
                      isSelected
                        ? 'bg-slate-800 border-red-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-850 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-white group-hover:text-red-400 transition">
                          {table.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                            table.category === 'core'
                              ? 'bg-purple-900/40 text-purple-300'
                              : table.category === 'ride'
                              ? 'bg-blue-900/40 text-blue-300'
                              : table.category === 'billing'
                              ? 'bg-emerald-900/40 text-emerald-300'
                              : 'bg-amber-900/40 text-amber-300'
                          }`}
                        >
                          {table.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                        {table.description}
                      </p>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 transition ${
                        isSelected ? 'text-red-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Schema Inspector for Selected Table */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            {/* Table Header */}
            <div className="p-6 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-red-500" />
                  <h3 className="text-xl font-bold font-mono text-white">
                    {activeTable.name}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {activeTable.columns.length} columns
                  </span>
                </div>
                <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Category: {activeTable.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {activeTable.description}
              </p>
            </div>

            {/* Columns Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold font-mono">
                  <tr>
                    <th className="py-3 px-4">Column</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Nullable</th>
                    <th className="py-3 px-4">Default / Constraints</th>
                    <th className="py-3 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {activeTable.columns.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-200">
                        <div className="flex items-center space-x-1.5">
                          {col.isPrimary && (
                            <span title="Primary Key" className="p-1 rounded bg-amber-500/20 text-amber-400">
                              <Key className="w-3 h-3" />
                            </span>
                          )}
                          {col.isForeign && (
                            <span title={`Foreign Key: ${col.references}`} className="p-1 rounded bg-sky-500/20 text-sky-400">
                              <Hash className="w-3 h-3" />
                            </span>
                          )}
                          <span className={col.isPrimary ? 'text-amber-300 font-bold' : col.isForeign ? 'text-sky-300' : 'text-slate-200'}>
                            {col.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400">
                        {col.type}
                      </td>
                      <td className="py-3 px-4">
                        {col.nullable ? (
                          <span className="text-slate-500 font-mono">NULL</span>
                        ) : (
                          <span className="text-rose-400 font-mono font-semibold">NOT NULL</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {col.constraints ? (
                          <span className="text-amber-400/90 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                            {col.constraints}
                          </span>
                        ) : col.defaultVal ? (
                          <span className="text-slate-400">DEFAULT {col.defaultVal}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs">
                        {col.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Indexes & Constraints Footer */}
            <div className="p-5 bg-slate-950/70 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center space-x-1.5">
                  <Hash className="w-3.5 h-3.5 text-sky-400" />
                  <span>Indexes ({activeTable.indexes.length})</span>
                </h4>
                <div className="space-y-1.5">
                  {activeTable.indexes.map((idx) => (
                    <div key={idx.name} className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sky-300 font-semibold">{idx.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {idx.type}
                        </span>
                      </div>
                      <div className="text-slate-400 mt-1 font-mono text-[10px]">
                        ON ({idx.columns.join(', ')})
                      </div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{idx.purpose}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Table Invariants & Constraints</span>
                </h4>
                <div className="space-y-1.5">
                  {activeTable.constraints.map((c, i) => (
                    <div key={i} className="p-2 bg-slate-900 rounded border border-slate-800 font-mono text-[11px] text-emerald-300/90 flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
