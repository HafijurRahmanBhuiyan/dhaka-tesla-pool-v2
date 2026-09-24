import React, { useState } from 'react';
import { DOCKER_COMPOSE_YML } from '../data/architectureData';
import { Copy, Check, Box, Cpu, Network, HardDrive, Terminal } from 'lucide-react';

export const DockerComposeView: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(DOCKER_COMPOSE_YML);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-3">
              <Box className="w-3.5 h-3.5" />
              <span>Containerized Multi-Service Deployment</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Docker Compose Architecture
            </h2>
            <p className="mt-2 text-slate-400 text-sm max-w-3xl">
              Production-parity local development environment bundling PostgreSQL 16 with persistent volume,
              Redis 7 with password auth and healthchecks, Node.js API (Fastify/Express), and React Vite frontend.
            </p>
          </div>

          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied Compose</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copy docker-compose.yml</span>
              </>
            )}
          </button>
        </div>

        {/* 4 Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center space-x-2 text-sky-400 font-mono text-xs font-bold mb-1">
              <HardDrive className="w-4 h-4" />
              <span>postgres:16-alpine</span>
            </div>
            <div className="text-[11px] text-slate-400">Port 5432 • pgdata volume • init.sql bootstrap • healthcheck</div>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center space-x-2 text-rose-400 font-mono text-xs font-bold mb-1">
              <Cpu className="w-4 h-4" />
              <span>redis:7-alpine</span>
            </div>
            <div className="text-[11px] text-slate-400">Port 6379 • AOF persistence • Auth protected • Geo tracking</div>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center space-x-2 text-amber-400 font-mono text-xs font-bold mb-1">
              <Terminal className="w-4 h-4" />
              <span>api (Node.js)</span>
            </div>
            <div className="text-[11px] text-slate-400">Port 4000 • Hot reload • Fastify/Express • Matches Dhaka routes</div>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-bold mb-1">
              <Network className="w-4 h-4" />
              <span>web (React Vite)</span>
            </div>
            <div className="text-[11px] text-slate-400">Port 3000 • Passenger & Driver cockpit • WebSocket client</div>
          </div>
        </div>
      </div>

      {/* YAML code viewer */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span>docker-compose.yml</span>
          </div>
          <span>version: '3.9'</span>
        </div>
        <div className="p-4 sm:p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed">
            {DOCKER_COMPOSE_YML}
          </pre>
        </div>
      </div>
    </div>
  );
};
