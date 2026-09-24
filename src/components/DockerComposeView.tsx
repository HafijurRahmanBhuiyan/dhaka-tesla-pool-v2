import React, { useState } from 'react';
import { DOCKER_COMPOSE_YML, ENV_EXAMPLE } from '../data/architectureData';
import { Copy, Check, Box, Network, HardDrive, Terminal, HeartPulse, FileText, Play } from 'lucide-react';

export const DockerComposeView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'compose' | 'env'>('compose');
  const [copied, setCopied] = useState<boolean>(false);

  const activeContent = activeTab === 'compose' ? DOCKER_COMPOSE_YML : ENV_EXAMPLE;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-3">
              <Box className="w-3.5 h-3.5" />
              <span>Containerized Multi-Service Deployment</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Docker Compose & Environment Config
            </h2>
            <p className="mt-2 text-slate-400 text-sm max-w-3xl">
              Production-ready multi-service container setup: <strong className="text-white">api</strong> (Node.js/Express on port 4000), <strong className="text-white">db</strong> (PostgreSQL 16 with persistent named volume & healthcheck), and <strong className="text-white">web</strong> (React/Vite dev server on port 5173). The entire system boots reliably with a single command.
            </p>
          </div>

          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition self-start sm:self-auto cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>{activeTab === 'compose' ? 'Copy docker-compose.yml' : 'Copy .env.example'}</span>
              </>
            )}
          </button>
        </div>

        {/* 3 Service Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Service 1: db */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2 text-sky-400 font-mono text-xs font-bold">
                <HardDrive className="w-4 h-4" />
                <span>db (PostgreSQL 16)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                Port 5432
              </span>
            </div>
            <div className="text-xs text-slate-300 font-semibold mb-1">
              Named Volume & Healthcheck
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Image <code className="text-sky-300">postgres:16-alpine</code> with persistent <code className="text-sky-300">postgres_data</code> volume. Uses <code className="text-slate-300">pg_isready</code> healthcheck to delay API boot until DB is accepting connections.
            </p>
          </div>

          {/* Service 2: api */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2 text-amber-400 font-mono text-xs font-bold">
                <Terminal className="w-4 h-4" />
                <span>api (Node.js / Express)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                Port 4000
              </span>
            </div>
            <div className="text-xs text-slate-300 font-semibold mb-1 flex items-center space-x-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              <span>/health Endpoint Healthcheck</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Express backend with <code className="text-slate-300">DATABASE_URL</code> and <code className="text-slate-300">JWT_SECRET</code> env vars. Depends on <code className="text-amber-300">db: service_healthy</code>. Pings <code className="text-amber-300">http://localhost:4000/health</code>.
            </p>
          </div>

          {/* Service 3: web */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-bold">
                <Network className="w-4 h-4" />
                <span>web (React / Vite)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Port 5173
              </span>
            </div>
            <div className="text-xs text-slate-300 font-semibold mb-1">
              Dev Server with Hot Reload
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vite dev server exposed on host port 5173. Boot is sequenced after <code className="text-emerald-300">api: service_healthy</code> so frontend never encounters connection-refused errors.
            </p>
          </div>
        </div>

        {/* Quick Launch Instruction */}
        <div className="mt-5 p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-300">
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Single Command Launch:</span>
            <code className="text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              docker compose up --build
            </code>
          </div>
          <span className="text-slate-500">Auto-resolves dependencies via healthchecks</span>
        </div>

        {/* Tab switch */}
        <div className="mt-6 flex space-x-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'compose'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Box className="w-4 h-4 text-blue-400" />
            <span>docker-compose.yml</span>
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'env'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>.env.example (Environment Placeholders)</span>
          </button>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span>{activeTab === 'compose' ? 'docker-compose.yml' : '.env.example'}</span>
          </div>
          <span>{activeTab === 'compose' ? "version: '3.8'" : 'Template Variables'}</span>
        </div>
        <div className="p-4 sm:p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed">
            {activeContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
