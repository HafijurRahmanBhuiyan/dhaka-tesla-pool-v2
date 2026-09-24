import React, { useState } from 'react';
import { ArchitectureView } from './components/ArchitectureView';
import { ERDView } from './components/ERDView';
import { RelationshipsView } from './components/RelationshipsView';
import { SqlSchemaView } from './components/SqlSchemaView';
import { DockerComposeView } from './components/DockerComposeView';
import { SimulatorView } from './components/SimulatorView';
import { ApiAuthView } from './components/ApiAuthView';
import { PassengerFlowView } from './components/PassengerFlowView';
import { DriverDashboardView } from './components/DriverDashboardView';
import {
  Layers,
  Database,
  Network,
  FileCode,
  Box,
  PlayCircle,
  Car,
  Shield,
  Zap,
  KeyRound,
  Navigation,
  Radio
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<
    'passenger' | 'driver' | 'api-auth' | 'arch' | 'erd' | 'relationships' | 'sql' | 'docker' | 'simulator'
  >('driver');

  const navItems = [
    { id: 'driver', label: "Driver Dashboard (Jashim)", icon: Radio, badge: 'Bullet' },
    { id: 'passenger', label: 'Passenger Flow', icon: Navigation, badge: 'Live Polling' },
    { id: 'api-auth', label: 'Express Auth & Routes', icon: KeyRound, badge: 'Live API' },
    { id: 'arch', label: 'Component Architecture', icon: Layers, badge: 'Mermaid' },
    { id: 'erd', label: 'ERD & Tables', icon: Database, badge: '9 Tables' },
    { id: 'relationships', label: 'Relationships', icon: Network, badge: '1-2 Lines' },
    { id: 'sql', label: 'PostgreSQL DDL', icon: FileCode, badge: 'Postgres 16' },
    { id: 'docker', label: 'Docker Compose', icon: Box, badge: '3 Services' },
    { id: 'simulator', label: 'Live Pool Simulator', icon: PlayCircle, badge: 'Interactive' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-900/30">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-extrabold text-base tracking-tight text-white">
                    Dhaka Tesla Pool
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold">
                    MVP ARCHITECT
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Node.js + PostgreSQL + React (Vite) + Docker Compose
                </div>
              </div>
            </div>

            {/* Quick Status Badges */}
            <div className="hidden md:flex items-center space-x-3 text-xs font-mono">
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>3 Actors: Passenger • Driver • Pool</span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Tesla 4-Seat Strict Capacity</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none border-t border-slate-850 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white font-semibold shadow-md shadow-red-950'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-red-800 text-red-100'
                        : 'bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'driver' && <DriverDashboardView />}
        {activeTab === 'passenger' && <PassengerFlowView />}
        {activeTab === 'api-auth' && <ApiAuthView />}
        {activeTab === 'arch' && <ArchitectureView />}
        {activeTab === 'erd' && <ERDView />}
        {activeTab === 'relationships' && <RelationshipsView />}
        {activeTab === 'sql' && <SqlSchemaView />}
        {activeTab === 'docker' && <DockerComposeView />}
        {activeTab === 'simulator' && <SimulatorView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">Dhaka Tesla Pool MVP</span>
            <span>•</span>
            <span>Senior Backend Architecture Specification</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span>Fastify/Express</span>
            <span>•</span>
            <span>PostgreSQL 16 (ACID)</span>
            <span>•</span>
            <span>Redis 7 (Geo + Redlock)</span>
            <span>•</span>
            <span>Docker Compose</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
