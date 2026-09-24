import React from 'react';
import { COMPONENT_MERMAID } from '../data/architectureData';
import { MermaidViewer } from './MermaidViewer';
import { Server, Database, Smartphone, ShieldCheck, Zap, Layers, RefreshCw } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-900/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Dhaka Tesla Pool MVP • System Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Component Architecture: Browser → React → Node.js API → PostgreSQL
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
            High-concurrency, low-latency ride-pooling architecture designed for urban Dhaka corridors.
            Combines Vite React single-page clients, an event-driven Node.js backend (Fastify/Express),
            Redis distributed locking for strict Tesla 4-seat capacity management, and PostgreSQL with
            ACID transaction semantics and spatial indexing.
          </p>
        </div>
      </div>

      {/* Mermaid Diagram */}
      <MermaidViewer
        id="component-architecture"
        title="Component Architecture & Subsystem Data Flow"
        chart={COMPONENT_MERMAID}
      />

      {/* Layer Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Layer 1: Client */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Tier 1</div>
              <h3 className="font-bold text-white text-base">React (Vite SPA)</h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Lightweight client bundle served over Nginx. Implements reactive UI for Passengers (requesting seats & route stops), Drivers (Tesla cockpit navigation & manifest), and Operations Admins.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Vite 5</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">React 18</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Tailwind CSS</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Socket.io Client</span>
          </div>
        </div>

        {/* Layer 2: API Gateway */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Tier 2</div>
              <h3 className="font-bold text-white text-base">Node.js Engine</h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Fastify or Express runtime powering REST endpoints, JWT role guards, dynamic fare calculations, and corridor pool matching with max 30% detour threshold.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Fastify / Express</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">TypeScript</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Socket.io</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Kysely / Knex</span>
          </div>
        </div>

        {/* Layer 3: In-Memory Redis */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Tier 3</div>
              <h3 className="font-bold text-white text-base">Redis Broker</h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sub-millisecond driver live location tracking using Redis Geospatial (<code className="text-rose-300">GEOADD</code>), distributed locks (Redlock) for race-free seat reservations, and Pub/Sub.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Redis 7</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">GEO Commands</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Redlock</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Pub/Sub</span>
          </div>
        </div>

        {/* Layer 4: PostgreSQL */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Tier 4</div>
              <h3 className="font-bold text-white text-base">PostgreSQL 16</h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Persistent system of record. Enforces ACID guarantees, row-level locks (<code className="text-sky-300">SELECT ... FOR UPDATE</code>), CHECK constraints, PostGIS spatial queries, and immutable audit logs.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Postgres 16</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">PostGIS</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">ACID Locks</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">B-Tree / GIST</span>
          </div>
        </div>
      </div>

      {/* End-to-End Request Lifecycle */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-slate-800 rounded-lg text-red-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">End-to-End Pooling Lifecycle & Data Flow</h3>
            <p className="text-xs text-slate-400">How a passenger booking travels through the 4 tiers</p>
          </div>
        </div>

        <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
          {/* Step 1 */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-red-500 border-4 border-slate-900" />
            <div className="text-xs font-mono text-red-400 font-semibold">STEP 01 • INITIATION</div>
            <h4 className="font-semibold text-white text-sm mt-0.5">Passenger Submits Ride Request</h4>
            <p className="text-xs text-slate-400 mt-1">
              Browser sends authenticated HTTPS POST to <code className="text-slate-300">/api/v1/rides/requests</code> specifying pickup, dropoff, and requested seat count (1-4).
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-500 border-4 border-slate-900" />
            <div className="text-xs font-mono text-amber-400 font-semibold">STEP 02 • CORRIDOR MATCHING</div>
            <h4 className="font-semibold text-white text-sm mt-0.5">Node.js Matcher Queries Forming Pools</h4>
            <p className="text-xs text-slate-400 mt-1">
              Matching engine filters active pools traveling the same corridor (e.g. Airport Road / Mirpur Road) where <code className="text-slate-300">available_seats &gt;= requested_seats</code> and additional detour factor is under 30% (1.30x).
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-sky-500 border-4 border-slate-900" />
            <div className="text-xs font-mono text-sky-400 font-semibold">STEP 03 • CONCURRENCY CONTROL</div>
            <h4 className="font-semibold text-white text-sm mt-0.5">Atomic Reservation & Row-Level Lock</h4>
            <p className="text-xs text-slate-400 mt-1">
              PostgreSQL initiates transaction with <code className="text-slate-300">SELECT ... FOR UPDATE</code> on the target pool record. Checks remaining seats, creates <code className="text-slate-300">pool_members</code> row, decrements <code className="text-slate-300">available_seats</code>, and commits atomically. Overbooking is mathematically impossible.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-slate-900" />
            <div className="text-xs font-mono text-emerald-400 font-semibold">STEP 04 • REAL-TIME DISPATCH</div>
            <h4 className="font-semibold text-white text-sm mt-0.5">WebSocket Broadcast to Tesla Driver & Passengers</h4>
            <p className="text-xs text-slate-400 mt-1">
              Node.js emits real-time trip update over WebSocket to the Tesla driver cockpit (new waypoint added to route) and passenger client (Tesla ETA, driver details, and 30% pooling discount applied).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
