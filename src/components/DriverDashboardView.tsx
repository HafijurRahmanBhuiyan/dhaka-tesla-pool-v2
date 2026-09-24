import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Users,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  LogIn,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Zap,
  BatteryCharging,
  Radio,
  Play,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Compass
} from 'lucide-react';

interface PassengerManifestItem {
  id: string;
  ride_request_id: string;
  passenger_id: string;
  passenger_name: string;
  seat_number: number;
  seat_label: string;
  pickup_zone: string;
  pickup_zone_name: string;
  dropoff_zone: string;
  dropoff_zone_name: string;
  pickup_order: number;
  dropoff_order: number;
  seats_reserved: number;
  status: 'REQUESTED' | 'MATCHED' | 'ACCEPTED' | 'DRIVER_ARRIVED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  fare_bdt: number;
  joined_at: string;
}

interface CabinSeat {
  position: string;
  label: string;
  occupant: string;
  passenger?: PassengerManifestItem | null;
  role: 'driver' | 'passenger';
  isOccupied: boolean;
}

interface VehicleTelemetry {
  id: string;
  nickname: string;
  model: string;
  license_plate: string;
  color: string;
  battery_level_pct: number;
  total_seat_capacity: number;
  occupied_seats: number;
  available_seats: number;
  capacity_pct: number;
}

interface AssignedPoolData {
  id: string;
  status: string;
  collective_status: 'MATCHED' | 'DRIVER_ARRIVED' | 'STARTED' | 'COMPLETED';
  corridor_name: string;
  route_direction: string;
  origin_zone: string;
  destination_zone: string;
  total_capacity: number;
  occupied_seats: number;
  remaining_seats: number;
  passengers_manifest: PassengerManifestItem[];
  cabin_layout: CabinSeat[];
}

export const DriverDashboardView: React.FC = () => {
  // Auth state
  const [token, setToken] = useState<string>(() => localStorage.getItem('dtp_driver_token') || '');
  const [driverUser, setDriverUser] = useState<any>(() => {
    const saved = localStorage.getItem('dtp_driver_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth form
  const [authEmail, setAuthEmail] = useState('jashim@dhakatesla.com');
  const [authPassword, setAuthPassword] = useState('Password123!');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Console data
  const [vehicle, setVehicle] = useState<VehicleTelemetry | null>(null);
  const [pool, setPool] = useState<AssignedPoolData | null>(null);
  const [loadingConsole, setLoadingConsole] = useState(false);
  const [errorConsole, setErrorConsole] = useState<string | null>(null);

  // Transition in flight
  const [actionLoading, setActionLoading] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  // Polling state
  const [pollCountdown, setPollCountdown] = useState(5);

  const persistDriverAuth = (newToken: string, user: any) => {
    setToken(newToken);
    setDriverUser(user);
    localStorage.setItem('dtp_driver_token', newToken);
    localStorage.setItem('dtp_driver_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setToken('');
    setDriverUser(null);
    setVehicle(null);
    setPool(null);
    localStorage.removeItem('dtp_driver_token');
    localStorage.removeItem('dtp_driver_user');
  };

  // 1. Authenticate as Jashim
  const handleDriverLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Login failed.');
      }
      if (data.data.user.role !== 'driver') {
        throw new Error('This console is reserved for Drivers. Please log in with a driver account.');
      }
      persistDriverAuth(data.data.token, data.data.user);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadJashimCredentials = () => {
    setAuthEmail('jashim@dhakatesla.com');
    setAuthPassword('Password123!');
  };

  // 2. Fetch Driver Console (Jashim's Pool & Bullet)
  const fetchConsole = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoadingConsole(true);
    setErrorConsole(null);

    try {
      const res = await fetch('/api/v1/driver/console', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(data.error?.message || data.message || 'Failed to retrieve cockpit telemetry.');
      }

      setVehicle(data.data.vehicle);
      setPool(data.data.assignedPool);
    } catch (err: any) {
      setErrorConsole(err.message);
    } finally {
      if (!silent) setLoadingConsole(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchConsole();
    }
  }, [token, fetchConsole]);

  // 3. Live 5s Polling
  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      setPollCountdown((prev) => {
        if (prev <= 1) {
          fetchConsole(true);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [token, fetchConsole]);

  // 4. Advance Single Ride State (State Machine API)
  const handleTransitionRide = async (rideId: string, targetStatus: string, passengerName: string) => {
    if (!token) return;
    setActionLoading(true);
    setLastActionMessage(null);
    try {
      const res = await fetch(`/api/v1/driver/rides/${rideId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          target_status: targetStatus,
          reason: `Captain Jashim advanced ${passengerName}'s ride to ${targetStatus}`
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Transition rejected by state machine.');
      }
      setLastActionMessage(`${passengerName} transitioned to '${targetStatus}'.`);
      await fetchConsole(true);
    } catch (err: any) {
      alert(`State Machine Rejection: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Advance Master Pool (Arrived -> Start -> Complete)
  const handleAdvanceMasterPool = async () => {
    if (!token) return;
    setActionLoading(true);
    setLastActionMessage(null);
    try {
      const res = await fetch('/api/v1/driver/pool/advance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Could not advance pool state.');
      }
      setLastActionMessage(data.message);
      await fetchConsole(true);
    } catch (err: any) {
      alert(`Pool Advancement Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Reset Simulation Replay
  const handleResetPool = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/driver/pool/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLastActionMessage("Jashim's pool reset to MATCHED for test replay.");
      await fetchConsole(true);
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MATCHED':
        return {
          label: 'Matched / Dispatch Confirmed',
          color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
        };
      case 'DRIVER_ARRIVED':
        return {
          label: 'Arrived at Pickup',
          color: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
        };
      case 'STARTED':
        return {
          label: 'In Transit / Cruising',
          color: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        };
      case 'COMPLETED':
        return {
          label: 'Completed / Dropped Off',
          color: 'bg-slate-800 text-slate-300 border-slate-700'
        };
      default:
        return {
          label: status,
          color: 'bg-slate-800 text-slate-400 border-slate-700'
        };
    }
  };

  // ----------------------------------------------------------------------------------
  // RENDER: Unauthenticated State (Driver Login)
  // ----------------------------------------------------------------------------------
  if (!token) {
    return (
      <div className="max-w-md mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/30 mb-4">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Tesla Captain Cockpit
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access Jashim's assigned pool manifest and vehicle seat telemetry
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          {/* Quick Demo Pre-fill Banner */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-white">1-Click Captain Login</div>
              <div className="text-[11px] text-slate-400">Jashim Uddin · Vehicle "Bullet"</div>
            </div>
            <button
              type="button"
              onClick={loadJashimCredentials}
              className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Fill Jashim
            </button>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleDriverLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Driver Email</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="jashim@dhakatesla.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Cockpit Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shadow-lg shadow-blue-950 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting Cockpit...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Enter Cockpit Console</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          Role-protected endpoint · Verified Captain Credentials Required
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------------
  // RENDER: Authenticated Jashim's Cockpit Dashboard
  // ----------------------------------------------------------------------------------
  const collectiveStatus = pool?.collective_status || 'MATCHED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Driver Cockpit Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-950">
            J
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white text-base">Jashim Uddin</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/30">
                Tesla Captain
              </span>
              <span className="text-amber-400 text-xs font-mono">★ 4.99</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
              <span>jashim@dhakatesla.com</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-mono">Active Pool: {pool?.corridor_name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Polling Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-slate-400">Sync in {pollCountdown}s</span>
            <button
              onClick={() => fetchConsole(false)}
              disabled={loadingConsole}
              title="Poll cockpit now"
              className="text-slate-400 hover:text-white transition ml-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loadingConsole ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>

          <button
            onClick={handleResetPool}
            disabled={actionLoading}
            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition cursor-pointer text-xs flex items-center space-x-1"
            title="Reset simulation to initial state"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer text-xs flex items-center space-x-1"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {lastActionMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{lastActionMessage}</span>
        </div>
      )}

      {/* Global Error Alert */}
      {errorConsole && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorConsole}</span>
          </div>
          <button
            onClick={() => fetchConsole(false)}
            className="text-rose-400 hover:text-white underline font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------------------- */}
      {/* SECTION 1: VEHICLE & CAPACITY TELEMETRY ("BULLET") */}
      {/* ---------------------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-blue-400 shadow-inner">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  {vehicle?.model || 'Tesla Model 3 ("Bullet")'}
                </h3>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold font-mono border border-blue-500/30 uppercase">
                  Nickname: "{vehicle?.nickname || 'Bullet'}"
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                Plate: <strong className="text-slate-200">{vehicle?.license_plate || 'DHAKA-METRO-GA-77-5544'}</strong> · {vehicle?.color || 'Deep Metallic Blue'}
              </div>
            </div>
          </div>

          {/* Battery & System Health */}
          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Battery:</span>
              <strong className="text-emerald-400">{vehicle?.battery_level_pct || 92}%</strong>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">Supercharger Ready</span>
            </div>
          </div>
        </div>

        {/* Clear Indication of Remaining Seat Capacity on Bullet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Capacity Metric Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Bullet Cabin Capacity</span>
              <span className="text-blue-400 font-bold">Strict 4-Seat Limit</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-white">{vehicle?.occupied_seats || 3}</span>
              <span className="text-xs text-slate-400 font-mono">of {vehicle?.total_seat_capacity || 4} seats occupied</span>
            </div>

            {/* Visual Gauge */}
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 mt-2">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${vehicle?.capacity_pct || 75}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex justify-between">
              <span>Occupancy: {vehicle?.capacity_pct || 75}%</span>
              <span className="text-slate-500">Max: 4 Riders</span>
            </div>
          </div>

          {/* Remaining Seats Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-950 border border-emerald-500/30 space-y-1.5">
            <div className="text-[11px] font-mono text-emerald-400 uppercase font-semibold flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Remaining Seat Capacity</span>
            </div>
            <div className="text-3xl font-black text-emerald-300">
              {vehicle?.available_seats ?? 1} <span className="text-sm font-semibold text-emerald-400/80">Seat Remaining</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Bullet can accept <strong className="text-white">1 more corridor passenger</strong> before locking to protect passenger comfort.
            </p>
          </div>

          {/* Corridor Vector */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold flex items-center space-x-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              <span>Assigned Corridor</span>
            </div>
            <div className="text-xs font-bold text-white">
              {pool?.corridor_name || 'Gulshan 2 -> Banani -> Mohakhali -> Motijheel'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Direction: <span className="text-amber-400 font-bold">{pool?.route_direction || 'SOUTHBOUND'}</span> · 3 Scheduled Pickups
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------------------- */}
        {/* INTERACTIVE CABIN SEAT MAP OF BULLET */}
        {/* ---------------------------------------------------------------------------- */}
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
            <span>Bullet Cabin Seat Assignment Map (Tesla Model 3)</span>
            <span className="text-[11px] text-slate-500 font-normal">Front & Rear Rows</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs">
            {/* Captain Seat */}
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-blue-400 font-bold">FRONT LEFT</div>
                <div className="text-xs font-extrabold text-white mt-0.5">Captain Jashim</div>
              </div>
              <div className="text-[10px] text-blue-300 mt-2">Driver / Pilot</div>
            </div>

            {/* Seat 1 */}
            <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-emerald-400 font-bold">SEAT 1 (Front Pass.)</div>
                <div className="text-xs font-extrabold text-white mt-0.5">Nusrat Jahan</div>
              </div>
              <div className="text-[10px] text-slate-400 mt-2">Gulshan 2 → Motijheel</div>
            </div>

            {/* Seat 2 */}
            <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-emerald-400 font-bold">SEAT 2 (Rear Left)</div>
                <div className="text-xs font-extrabold text-white mt-0.5">Rafiqul Islam</div>
              </div>
              <div className="text-[10px] text-slate-400 mt-2">Banani 11 → Motijheel</div>
            </div>

            {/* Seat 4 (Center - AVAILABLE) */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-dashed border-emerald-500/50 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-emerald-400 font-bold">SEAT 4 (Rear Center)</div>
                <div className="text-xs font-extrabold text-emerald-300 mt-0.5">AVAILABLE</div>
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-2">1 Seat Remaining</div>
            </div>

            {/* Seat 3 */}
            <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-emerald-400 font-bold">SEAT 3 (Rear Right)</div>
                <div className="text-xs font-extrabold text-white mt-0.5">Tanvir Hossain</div>
              </div>
              <div className="text-[10px] text-slate-400 mt-2">Mohakhali → Kawran Bazar</div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------------- */}
      {/* SECTION 2: MASTER STATE-MACHINE CORRIDOR ADVANCEMENT BUTTONS */}
      {/* ---------------------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Corridor Ride State Machine Controller</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Advance Bullet's pool status along the state machine pipeline: <code className="text-blue-400">Arrived → Start → Complete</code>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono">Current Corridor State:</span>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono border ${getStatusBadge(collectiveStatus).color}`}>
              {collectiveStatus}
            </span>
          </div>
        </div>

        {/* 3 Prominent Advancement Buttons (Arrived -> Start -> Complete) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Button 1: ARRIVED */}
          <button
            onClick={() => handleAdvanceMasterPool()}
            disabled={actionLoading || collectiveStatus !== 'MATCHED'}
            className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between space-y-2 ${
              collectiveStatus === 'MATCHED'
                ? 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-950 font-bold'
                : collectiveStatus === 'DRIVER_ARRIVED' || collectiveStatus === 'STARTED' || collectiveStatus === 'COMPLETED'
                ? 'bg-slate-950 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                : 'bg-slate-950 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase">Step 1</span>
              {collectiveStatus !== 'MATCHED' ? <Check className="w-4 h-4 text-emerald-400" /> : <MapPin className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-sm font-extrabold">1. Arrived at Pickup</div>
              <div className="text-[11px] opacity-90 mt-0.5 font-normal">
                Transitions status to <code className="font-mono">DRIVER_ARRIVED</code>
              </div>
            </div>
          </button>

          {/* Button 2: START */}
          <button
            onClick={() => handleAdvanceMasterPool()}
            disabled={actionLoading || collectiveStatus !== 'DRIVER_ARRIVED'}
            className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between space-y-2 ${
              collectiveStatus === 'DRIVER_ARRIVED'
                ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-950 font-bold'
                : collectiveStatus === 'STARTED' || collectiveStatus === 'COMPLETED'
                ? 'bg-slate-950 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                : 'bg-slate-950 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase">Step 2</span>
              {collectiveStatus === 'STARTED' || collectiveStatus === 'COMPLETED' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-sm font-extrabold">2. Start Trip</div>
              <div className="text-[11px] opacity-90 mt-0.5 font-normal">
                Transitions status to <code className="font-mono">STARTED</code> (In Transit)
              </div>
            </div>
          </button>

          {/* Button 3: COMPLETE */}
          <button
            onClick={() => handleAdvanceMasterPool()}
            disabled={actionLoading || collectiveStatus !== 'STARTED'}
            className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between space-y-2 ${
              collectiveStatus === 'STARTED'
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-950 font-bold'
                : collectiveStatus === 'COMPLETED'
                ? 'bg-slate-950 border-slate-800 text-emerald-400 opacity-80 cursor-not-allowed'
                : 'bg-slate-950 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase">Step 3</span>
              {collectiveStatus === 'COMPLETED' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-sm font-extrabold">3. Complete Trip</div>
              <div className="text-[11px] opacity-90 mt-0.5 font-normal">
                Transitions status to <code className="font-mono">COMPLETED</code> (Terminal)
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------------- */}
      {/* SECTION 3: CURRENT PASSENGERS MANIFEST & INDIVIDUAL CONTROLS */}
      {/* ---------------------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Current Passengers Manifest ({pool?.passengers_manifest?.length || 3} Riders on Bullet)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pickup/dropoff stops, physical seat assignments, and individual state-machine actions
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Southbound Arterial Route</span>
        </div>

        <div className="space-y-3">
          {pool?.passengers_manifest?.map((passenger) => {
            const statusInfo = getStatusBadge(passenger.status);

            return (
              <div
                key={passenger.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Seat & Passenger Info */}
                <div className="flex items-start space-x-3">
                  <div className="px-2.5 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 font-mono text-xs font-bold text-center shrink-0">
                    <div>{passenger.seat_number}</div>
                    <div className="text-[9px] uppercase text-blue-400">Seat</div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">{passenger.passenger_name}</span>
                      <span className="text-[11px] font-mono text-slate-400">({passenger.seat_label})</span>
                    </div>

                    {/* Pickup & Dropoff Stops */}
                    <div className="flex items-center space-x-2 text-xs text-slate-300 mt-1">
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{passenger.pickup_zone_name}</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="text-rose-400 flex items-center space-x-1">
                        <Navigation className="w-3 h-3" />
                        <span>{passenger.dropoff_zone_name}</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      Request ID: <span className="text-slate-300">{passenger.ride_request_id}</span> · Fare:{' '}
                      <strong className="text-white">{passenger.fare_bdt.toFixed(2)} BDT</strong> (20% Pool Discount Applied)
                    </div>
                  </div>
                </div>

                {/* Status & Individual State Transition Buttons */}
                <div className="flex items-center space-x-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${statusInfo.color}`}>
                    {passenger.status}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {passenger.status === 'MATCHED' && (
                      <button
                        onClick={() => handleTransitionRide(passenger.ride_request_id, 'DRIVER_ARRIVED', passenger.passenger_name)}
                        disabled={actionLoading}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        → Arrived
                      </button>
                    )}

                    {passenger.status === 'DRIVER_ARRIVED' && (
                      <button
                        onClick={() => handleTransitionRide(passenger.ride_request_id, 'STARTED', passenger.passenger_name)}
                        disabled={actionLoading}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        → Start
                      </button>
                    )}

                    {passenger.status === 'STARTED' && (
                      <button
                        onClick={() => handleTransitionRide(passenger.ride_request_id, 'COMPLETED', passenger.passenger_name)}
                        disabled={actionLoading}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        → Complete
                      </button>
                    )}

                    {passenger.status === 'COMPLETED' && (
                      <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Delivered</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Seat 4 Available Callout */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-dashed border-emerald-500/40 flex items-center justify-between text-xs font-mono text-emerald-300">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Seat 4 (Rear Center): <strong>Available for Corridor Dispatch</strong></span>
          </div>
          <span className="text-[11px] text-slate-400">Remaining seat capacity: 1 of 4</span>
        </div>
      </div>
    </div>
  );
};
