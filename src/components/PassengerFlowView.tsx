import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Car,
  MapPin,
  Navigation,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  XCircle,
  LogIn,
  UserPlus,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Zap,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  Lock,
  Compass
} from 'lucide-react';

export interface DhakaZone {
  id: string;
  name: string;
  cluster: 'NORTH' | 'CENTRAL' | 'SOUTH';
}

export const DHAKA_ZONES_LIST: DhakaZone[] = [
  { id: 'UTTARA', name: 'Uttara Sector 3/11', cluster: 'NORTH' },
  { id: 'AIRPORT', name: 'Hazrat Shahjalal Airport', cluster: 'NORTH' },
  { id: 'BANANI', name: 'Banani Road 11', cluster: 'NORTH' },
  { id: 'GULSHAN2', name: 'Gulshan-2 Circle', cluster: 'NORTH' },
  { id: 'GULSHAN1', name: 'Gulshan-1 Circle', cluster: 'NORTH' },
  { id: 'MOHAKHALI', name: 'Mohakhali Flyover', cluster: 'CENTRAL' },
  { id: 'TEJGAON', name: 'Tejgaon Industrial Area', cluster: 'CENTRAL' },
  { id: 'FARMGATE', name: 'Farmgate Bus Terminal', cluster: 'CENTRAL' },
  { id: 'KAWRANBAZAR', name: 'Kawran Bazar SAARC', cluster: 'CENTRAL' },
  { id: 'SHAHBAGH', name: 'Shahbagh Intersection', cluster: 'SOUTH' },
  { id: 'MOTIJHEEL', name: 'Motijheel Shapla Chattar', cluster: 'SOUTH' }
];

interface PassengerUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ActiveRide {
  id: string;
  status: 'REQUESTED' | 'MATCHED' | 'ACCEPTED' | 'DRIVER_ARRIVED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  pickup_zone: string;
  pickupZoneName: string;
  dropoff_zone: string;
  dropoffZoneName: string;
  requested_seats: number;
  distanceKm: number;
  fareBreakdown: {
    baseFare: number;
    distanceCharge: number;
    grossFare: number;
    poolDiscountPercent: number;
    poolDiscount: number;
    passengerFare: number;
    fareInBdt: number;
  };
  pool?: {
    id: string;
    driver_name: string;
    vehicle_model: string;
    license_plate: string;
    corridor: string;
    available_seats: number;
    total_capacity: number;
    current_members_count: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export const PassengerFlowView: React.FC = () => {
  // Auth state
  const [token, setToken] = useState<string>(() => localStorage.getItem('dtp_passenger_token') || '');
  const [currentUser, setCurrentUser] = useState<PassengerUser | null>(() => {
    const saved = localStorage.getItem('dtp_passenger_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth form
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('passenger@dhakatesla.com');
  const [authPassword, setAuthPassword] = useState('Password123!');
  const [authFullName, setAuthFullName] = useState('Tanvir Hossain');
  const [authPhone, setAuthPhone] = useState('+8801712345678');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard & Ride State
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Ride Request Form
  const [pickupZone, setPickupZone] = useState<string>('GULSHAN2');
  const [dropoffZone, setDropoffZone] = useState<string>('MOTIJHEEL');
  const [requestedSeats, setRequestedSeats] = useState<number>(1);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Polling State (5 seconds interval)
  const [pollCountdown, setPollCountdown] = useState<number>(5);
  const [isPollingActive, setIsPollingActive] = useState<boolean>(true);
  const [simLoading, setSimLoading] = useState(false);

  // Save auth
  const persistAuth = (newToken: string, user: PassengerUser) => {
    setToken(newToken);
    setCurrentUser(user);
    localStorage.setItem('dtp_passenger_token', newToken);
    localStorage.setItem('dtp_passenger_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    setActiveRide(null);
    localStorage.removeItem('dtp_passenger_token');
    localStorage.removeItem('dtp_passenger_user');
  };

  // 1. Auth Handlers
  const handleLogin = async (e?: React.FormEvent) => {
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
      if (data.data.user.role !== 'passenger') {
        throw new Error('This portal is reserved for Passengers. Please log in with a passenger account.');
      }
      persistAuth(data.data.token, {
        id: data.data.user.id,
        name: data.data.user.full_name,
        email: data.data.user.email,
        role: data.data.user.role
      });
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          full_name: authFullName,
          phone: authPhone,
          role: 'passenger'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Signup failed.');
      }
      persistAuth(data.data.token, {
        id: data.data.user.id,
        name: data.data.user.full_name,
        email: data.data.user.email,
        role: data.data.user.role
      });
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick Preset credentials
  const loadTanvirCredentials = () => {
    setAuthEmail('passenger@dhakatesla.com');
    setAuthPassword('Password123!');
    setAuthMode('login');
  };

  // 2. Fetch Passenger Dashboard
  const fetchDashboard = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setDashboardLoading(true);
    setDashboardError(null);
    try {
      const res = await fetch('/api/v1/passenger/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(data.error?.message || data.message || 'Failed to fetch ride status.');
      }

      setActiveRide(data.data.activeRide || null);
    } catch (err: any) {
      setDashboardError(err.message);
    } finally {
      if (!silent) setDashboardLoading(false);
    }
  }, [token]);

  // Initial dashboard load
  useEffect(() => {
    if (token) {
      fetchDashboard();
    }
  }, [token, fetchDashboard]);

  // 3. Live 5-Second Polling Loop
  useEffect(() => {
    if (!token || !isPollingActive) return;

    // Tick countdown every second
    const countdownTimer = setInterval(() => {
      setPollCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboard(true);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [token, isPollingActive, fetchDashboard]);

  // 4. Request Ride Form Submission
  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (pickupZone === dropoffZone) {
      setRequestError('Pickup and dropoff zones cannot be the same. Please choose different zones.');
      return;
    }

    setRequestLoading(true);
    setRequestError(null);

    try {
      const res = await fetch('/api/v1/passenger/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pickup_zone: pickupZone,
          dropoff_zone: dropoffZone,
          requested_seats: requestedSeats
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Ride request rejected.');
      }

      setFormOpen(false);
      await fetchDashboard();
    } catch (err: any) {
      setRequestError(err.message);
    } finally {
      setRequestLoading(false);
    }
  };

  // 5. Cancel Ride
  const handleCancelRide = async () => {
    if (!token || !activeRide) return;
    const confirmCancel = window.confirm('Are you sure you want to cancel your ride request?');
    if (!confirmCancel) return;

    try {
      const res = await fetch(`/api/v1/passenger/rides/${activeRide.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to cancel ride');
      }
      await fetchDashboard();
    } catch (err: any) {
      alert(`Error cancelling ride: ${err.message}`);
    }
  };

  // 6. Interactive Simulator: Advance Ride Status
  const handleAdvanceSimulation = async () => {
    if (!token || !activeRide) return;
    setSimLoading(true);
    try {
      const res = await fetch(`/api/v1/passenger/rides/${activeRide.id}/advance-sim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Simulation error');
      }
      await fetchDashboard(true);
    } catch (err: any) {
      alert(`Simulation info: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  // Instant Fare Estimation Preview
  const estimateFarePreview = () => {
    const basePaisa = 3000;
    const ratePaisa = 2500;
    // Estimated ~9.0 km
    const dist = 9.0;
    const distCharge = Math.round(dist * ratePaisa);
    const gross = basePaisa + distCharge;
    const poolDisc = Math.round(gross * 0.20);
    const netPaisa = gross - poolDisc;

    return {
      basePaisa,
      distCharge,
      gross,
      poolDisc,
      netPaisa,
      netBdt: netPaisa / 100
    };
  };

  const preview = estimateFarePreview();

  // Status mapping colors & labels
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return {
          label: 'Matching Pool...',
          color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          desc: 'Finding compatible Tesla along your corridor'
        };
      case 'MATCHED':
        return {
          label: 'Tesla Matched',
          color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          desc: 'Assigned to corridor pool. Driver en route to pickup.'
        };
      case 'ACCEPTED':
        return {
          label: 'Accepted by Captain',
          color: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
          desc: 'Driver confirmed reservation'
        };
      case 'DRIVER_ARRIVED':
        return {
          label: 'Driver Arrived',
          color: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
          desc: 'Tesla is waiting at your pickup point'
        };
      case 'STARTED':
        return {
          label: 'Trip in Progress',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse',
          desc: 'Cruising in electric comfort towards destination'
        };
      case 'COMPLETED':
        return {
          label: 'Trip Completed',
          color: 'bg-slate-800 text-slate-200 border-slate-700',
          desc: 'You have arrived safely at your destination'
        };
      case 'CANCELLED':
        return {
          label: 'Ride Cancelled',
          color: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
          desc: 'This trip was cancelled'
        };
      default:
        return {
          label: status,
          color: 'bg-slate-800 text-slate-300 border-slate-700',
          desc: ''
        };
    }
  };

  // ----------------------------------------------------------------------------------
  // RENDER: Unauthenticated State (Login / Signup)
  // ----------------------------------------------------------------------------------
  if (!token) {
    return (
      <div className="max-w-md mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-900/30 mb-4">
            <Car className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Passenger Portal
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Book zero-emission Tesla pools across Dhaka's primary arterial corridors
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          {/* Preset Fill Banner */}
          <div className="mb-5 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-200">1-Click Passenger Demo</div>
              <div className="text-[11px] text-slate-400">Tanvir Hossain · Gulshan to Motijheel</div>
            </div>
            <button
              type="button"
              onClick={loadTanvirCredentials}
              className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Fill Credentials
            </button>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                authMode === 'login'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                authMode === 'signup'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="e.g. Tanvir Hossain"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Phone Number (+880...)</label>
                  <input
                    type="tel"
                    required
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="+8801712345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="passenger@dhakatesla.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition cursor-pointer shadow-lg shadow-red-950 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{authMode === 'login' ? 'Sign In as Passenger' : 'Create Passenger Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Clean Unboxed Metadata */}
        <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-slate-500">
          <span>Dhaka Electric Fleet</span>
          <span aria-hidden="true">·</span>
          <span>Bcrypt & JWT Protected</span>
          <span aria-hidden="true">·</span>
          <span>Strict 4-Seat Pools</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------------
  // RENDER: Authenticated Passenger Experience
  // ----------------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Passenger Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow text-white font-bold text-sm">
            {currentUser?.name?.charAt(0) || 'P'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm">{currentUser?.name}</span>
              <span className="text-[11px] text-emerald-400 font-mono">Passenger</span>
            </div>
            <div className="text-xs text-slate-400">{currentUser?.email}</div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Live Polling Status Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400">Sync in {pollCountdown}s</span>
            <button
              onClick={() => fetchDashboard(false)}
              disabled={dashboardLoading}
              title="Poll status now"
              className="text-slate-400 hover:text-white transition ml-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${dashboardLoading ? 'animate-spin text-red-400' : ''}`} />
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer text-xs flex items-center space-x-1"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Error Alert */}
      {dashboardError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{dashboardError}</span>
          </div>
          <button
            onClick={() => fetchDashboard(false)}
            className="text-rose-400 hover:text-white underline font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------------------- */}
      {/* CASE A: Active Ride Exists -> Show Live Status & Fare Screen */}
      {/* ---------------------------------------------------------------------------- */}
      {activeRide ? (
        <div className="space-y-5">
          {/* Main Status Hero Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Status Header */}
            <div className="p-6 border-b border-slate-800 bg-gradient-to-b from-slate-850 to-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Ride Request #{activeRide.id}
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight mt-0.5">
                    {getStatusBadge(activeRide.status).label}
                  </h3>
                </div>

                <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono inline-flex items-center space-x-2 ${getStatusBadge(activeRide.status).color}`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{activeRide.status}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                {getStatusBadge(activeRide.status).desc}
              </p>

              {/* Progress Pipeline */}
              <div className="mt-6 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  {['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED'].map((step, idx) => {
                    const stepOrder = ['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED'];
                    const currentIdx = stepOrder.indexOf(activeRide.status);
                    const thisIdx = stepOrder.indexOf(step);
                    const isDone = currentIdx >= thisIdx && activeRide.status !== 'CANCELLED';
                    const isCurrent = activeRide.status === step;

                    return (
                      <div key={step} className="flex-1 flex items-center">
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                              isCurrent
                                ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900'
                                : isDone
                                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                                : 'bg-slate-950 border-slate-800 text-slate-600'
                            }`}
                          >
                            {isDone && !isCurrent ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[10px] mt-1.5 hidden sm:block ${isCurrent ? 'text-white font-bold' : 'text-slate-500'}`}>
                            {step.replace('_', ' ')}
                          </span>
                        </div>
                        {idx < 4 && (
                          <div
                            className={`h-0.5 flex-1 transition-colors ${
                              currentIdx > thisIdx ? 'bg-emerald-500' : 'bg-slate-800'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Corridor Journey & Vehicle Details */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Journey Route */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Your Journey Corridor
                </div>

                <div className="space-y-3 bg-slate-950 rounded-xl p-4 border border-slate-800">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-mono">PICKUP POINT</div>
                      <div className="text-sm font-bold text-white">{activeRide.pickupZoneName}</div>
                    </div>
                  </div>

                  <div className="w-px h-6 bg-slate-800 ml-3" />

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                      <Navigation className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-mono">DROPOFF DESTINATION</div>
                      <div className="text-sm font-bold text-white">{activeRide.dropoffZoneName}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
                  <span>Estimated Distance: <strong className="text-white">{activeRide.distanceKm} km</strong></span>
                  <span>Seats Reserved: <strong className="text-white">{activeRide.requested_seats} seat</strong></span>
                </div>
              </div>

              {/* Right: Assigned Tesla Vehicle & Driver */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Assigned Tesla Pool
                </div>

                {activeRide.pool ? (
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Car className="w-5 h-5 text-red-400" />
                        <div>
                          <div className="text-sm font-bold text-white">{activeRide.pool.vehicle_model}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{activeRide.pool.license_plate}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                        4-SEAT STRICT POOL
                      </span>
                    </div>

                    <div className="border-t border-slate-850 pt-2.5 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400 font-mono">Tesla Captain:</span>
                        <strong className="text-white">{activeRide.pool.driver_name}</strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400 font-mono">Corridor:</span>
                        <span className="text-slate-300 truncate max-w-[200px]">{activeRide.pool.corridor}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400 font-mono">Available Seats:</span>
                        <strong className="text-emerald-400">{activeRide.pool.available_seats} of {activeRide.pool.total_capacity} remaining</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-center py-6">
                    <RefreshCw className="w-6 h-6 mx-auto text-amber-400 animate-spin mb-2" />
                    <div className="text-xs font-bold text-white">Dispatcher Searching Corridor</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Finding an active Tesla Model 3 heading in your direction. Polling updates every 5 seconds.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Fare Breakdown Card (Strict Integer Paisa + BDT) */}
            <div className="p-6 bg-slate-950 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Your Passenger Fare Breakdown
                </div>
                <span className="text-[11px] text-slate-500 font-mono">All transactions in paisa</span>
              </div>

              {activeRide.fareBreakdown && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-mono">Base Fare</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {activeRide.fareBreakdown.baseFare.toLocaleString()} paisa
                    </div>
                    <div className="text-[10px] text-slate-500">{(activeRide.fareBreakdown.baseFare / 100).toFixed(2)} BDT</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-mono">Distance Charge</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {activeRide.fareBreakdown.distanceCharge.toLocaleString()} paisa
                    </div>
                    <div className="text-[10px] text-slate-500">{(activeRide.fareBreakdown.distanceCharge / 100).toFixed(2)} BDT</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-emerald-400 font-mono">
                      Pool Discount ({activeRide.fareBreakdown.poolDiscountPercent}%)
                    </div>
                    <div className="text-sm font-bold text-emerald-300 mt-0.5">
                      - {activeRide.fareBreakdown.poolDiscount.toLocaleString()} paisa
                    </div>
                    <div className="text-[10px] text-emerald-500">- {(activeRide.fareBreakdown.poolDiscount / 100).toFixed(2)} BDT</div>
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-950/40 to-slate-900 border border-red-500/30">
                    <div className="text-[11px] text-red-300 font-mono">Your Total Fare</div>
                    <div className="text-base font-extrabold text-white mt-0.5">
                      {activeRide.fareBreakdown.passengerFare.toLocaleString()} paisa
                    </div>
                    <div className="text-xs font-bold text-red-400">{activeRide.fareBreakdown.fareInBdt.toFixed(2)} BDT</div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>State Machine transition protected · Auto-sync active</span>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {/* Simulation Step Button: lets tester simulate driver progress */}
                {activeRide.status !== 'COMPLETED' && activeRide.status !== 'CANCELLED' && (
                  <button
                    onClick={handleAdvanceSimulation}
                    disabled={simLoading}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-700"
                    title="Simulate next lifecycle step"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{simLoading ? 'Advancing...' : 'Simulate Driver Step'}</span>
                  </button>
                )}

                {/* Cancel Ride Button */}
                {['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(activeRide.status) && (
                  <button
                    onClick={handleCancelRide}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Ride</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------------------------------- */
        /* CASE B: Empty State (No Active Ride) -> Prompt to Request a Ride */
        /* ---------------------------------------------------------------------------- */
        <div className="space-y-6">
          {!formOpen ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-xl space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
                <Compass className="w-8 h-8 text-red-400" />
              </div>

              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  No Active Ride in Progress
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Ready to travel across Dhaka in electric luxury? Request a Tesla pool and save 20% on shared corridor routes between Uttara, Gulshan, Banani, and Motijheel.
                </p>
              </div>

              <div>
                <button
                  onClick={() => setFormOpen(true)}
                  className="py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition cursor-pointer inline-flex items-center space-x-2"
                >
                  <Car className="w-4 h-4" />
                  <span>Request a Tesla Ride</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Corridor Highlights */}
              <div className="pt-6 border-t border-slate-800 max-w-lg mx-auto grid grid-cols-2 gap-3 text-left">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-[11px] font-mono text-emerald-400 font-bold">SOUTHBOUND CORRIDOR</div>
                  <div className="text-xs text-white mt-1">Gulshan 2 → Banani → Motijheel C/A</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">~9.8 km · 20% Pool Savings</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-[11px] font-mono text-sky-400 font-bold">NORTHBOUND CORRIDOR</div>
                  <div className="text-xs text-white mt-1">Motijheel → Farmgate → Uttara</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">~14.2 km · 20% Pool Savings</div>
                </div>
              </div>
            </div>
          ) : (
            /* ---------------------------------------------------------------------------- */
            /* "REQUEST A RIDE" FORM */
            /* ---------------------------------------------------------------------------- */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Request a Tesla Pool Ride
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select your pickup and dropoff points from Dhaka's verified transit hubs
                  </p>
                </div>
                <button
                  onClick={() => setFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {requestError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{requestError}</span>
                </div>
              )}

              <form onSubmit={handleRequestRide} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pickup Zone Dropdown */}
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pickup Zone (Dhaka Arterial)</span>
                    </label>
                    <select
                      value={pickupZone}
                      onChange={(e) => setPickupZone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                    >
                      {DHAKA_ZONES_LIST.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} ({zone.cluster})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dropoff Zone Dropdown */}
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center space-x-1.5">
                      <Navigation className="w-3.5 h-3.5 text-red-400" />
                      <span>Dropoff Zone (Dhaka Arterial)</span>
                    </label>
                    <select
                      value={dropoffZone}
                      onChange={(e) => setDropoffZone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                    >
                      {DHAKA_ZONES_LIST.map((zone) => (
                        <option key={zone.id} value={zone.id} disabled={zone.id === pickupZone}>
                          {zone.name} ({zone.cluster}) {zone.id === pickupZone ? '(Cannot match pickup)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Requested Seats */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>Number of Seats Needed</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setRequestedSeats(num)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          requestedSeats === num
                            ? 'bg-red-600/20 border-red-500 text-white shadow'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {num} {num === 1 ? 'Seat' : 'Seats'}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Strict maximum 4 seats per Tesla Model 3 vehicle.
                  </span>
                </div>

                {/* Real-time Fare Estimation Breakdown Preview */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Estimated Fare Breakdown</span>
                    <span className="text-emerald-400">20% Pool Discount Applied</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-850 text-xs font-mono">
                    <div>
                      <div className="text-slate-500 text-[10px]">Base Fare</div>
                      <div className="text-slate-200">{preview.basePaisa.toLocaleString()} p</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">Distance Charge</div>
                      <div className="text-slate-200">{preview.distCharge.toLocaleString()} p</div>
                    </div>
                    <div>
                      <div className="text-emerald-500 text-[10px]">Pool Discount (20%)</div>
                      <div className="text-emerald-300">- {preview.poolDisc.toLocaleString()} p</div>
                    </div>
                    <div>
                      <div className="text-red-400 text-[10px] font-bold">Estimated Fare</div>
                      <div className="text-white font-extrabold">{preview.netBdt.toFixed(2)} BDT</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={requestLoading}
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-red-950 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {requestLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Finding Tesla Pool...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Ride Request</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
