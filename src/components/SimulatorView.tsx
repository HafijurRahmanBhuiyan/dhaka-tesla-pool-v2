import React, { useState } from 'react';
import { SimulatedRideRequest, SimulatedPool } from '../types';
import { Car, Users, UserCheck, Play, Plus, RefreshCw, AlertCircle, CheckCircle, ShieldCheck, MapPin, DollarSign, Activity } from 'lucide-react';

const INITIAL_REQUESTS: SimulatedRideRequest[] = [
  {
    id: 'req-001',
    passengerName: 'Tanvir Hossain',
    phone: '+8801711223344',
    pickupName: 'Uttara Sector 7',
    dropoffName: 'Motijheel C/A',
    pickupLat: 23.8698,
    pickupLng: 90.3985,
    dropoffLat: 23.7275,
    dropoffLng: 90.4194,
    requestedSeats: 1,
    status: 'MATCHED',
    fareBDT: 520, // Discounted from 740
    poolId: 'pool-dhaka-01'
  },
  {
    id: 'req-002',
    passengerName: 'Samira Rahman',
    phone: '+8801819887766',
    pickupName: 'Hazrat Shahjalal Airport (Terminal 1)',
    dropoffName: 'Gulshan-2 Circle',
    pickupLat: 23.8433,
    pickupLng: 90.4037,
    dropoffLat: 23.7925,
    dropoffLng: 90.4078,
    requestedSeats: 2,
    status: 'MATCHED',
    fareBDT: 680,
    poolId: 'pool-dhaka-01'
  },
  {
    id: 'req-003',
    passengerName: 'Fahim Ahmed',
    phone: '+8801912345678',
    pickupName: 'Banani 11',
    dropoffName: 'Kawran Bazar',
    pickupLat: 23.7942,
    pickupLng: 90.4045,
    dropoffLat: 23.7512,
    dropoffLng: 90.3934,
    requestedSeats: 1,
    status: 'PENDING',
    fareBDT: 340
  },
  {
    id: 'req-004',
    passengerName: 'Nusrat Jahan',
    phone: '+8801678990011',
    pickupName: 'Mohakhali Flyover',
    dropoffName: 'Motijheel',
    pickupLat: 23.7776,
    pickupLng: 90.4005,
    dropoffLat: 23.7275,
    dropoffLng: 90.4194,
    requestedSeats: 2,
    status: 'PENDING',
    fareBDT: 420
  }
];

const INITIAL_POOL: SimulatedPool = {
  id: 'pool-dhaka-01',
  driverName: 'Rafiqul Islam (Rating 4.92 ★)',
  teslaModel: 'Tesla Model 3 Long Range',
  licensePlate: 'DHAKA-METRO-GA-44-8899',
  totalCapacity: 4,
  reservedSeats: 3, // Tanvir (1) + Samira (2)
  status: 'FORMING',
  currentLocation: 'Airport Road, passing Kawla',
  members: [
    {
      requestId: 'req-001',
      passengerName: 'Tanvir Hossain',
      seats: 1,
      pickup: 'Uttara Sector 7',
      dropoff: 'Motijheel C/A',
      status: 'BOOKED'
    },
    {
      requestId: 'req-002',
      passengerName: 'Samira Rahman (2 seats)',
      seats: 2,
      pickup: 'Airport T1',
      dropoff: 'Gulshan-2',
      status: 'BOOKED'
    }
  ]
};

export const SimulatorView: React.FC = () => {
  const [pool, setPool] = useState<SimulatedPool>(INITIAL_POOL);
  const [requests, setRequests] = useState<SimulatedRideRequest[]>(INITIAL_REQUESTS);
  const [txLog, setTxLog] = useState<string[]>([
    'PostgreSQL Connection Pool initialized [pg.Pool: 10 connections]',
    'Active Pool initialized: pool-dhaka-01 (Tesla Model 3, capacity: 4 seats)',
    'Passenger Tanvir booked 1 seat (Available: 3 remaining)',
    'Passenger Samira booked 2 seats (Available: 1 remaining)'
  ]);
  const [newPassengerName, setNewPassengerName] = useState('');
  const [newPickup, setNewPickup] = useState('Banani Road 11');
  const [newDropoff, setNewDropoff] = useState('Motijheel C/A');
  const [newSeats, setNewSeats] = useState(1);
  const [simMessage, setSimMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const availableSeats = pool.totalCapacity - pool.reservedSeats;

  const handleMatchRequest = (req: SimulatedRideRequest) => {
    if (pool.status !== 'FORMING') {
      setSimMessage({
        text: `Cannot match: Pool is already ${pool.status}. Tesla is in motion.`,
        type: 'error'
      });
      return;
    }

    if (req.requestedSeats > availableSeats) {
      setSimMessage({
        text: `Concurrency Check FAILED: Request needs ${req.requestedSeats} seats, but Tesla has only ${availableSeats} seat(s) remaining!`,
        type: 'error'
      });
      setTxLog((prev) => [
        `[TRANSACTION ROLLBACK] Attempted to book ${req.requestedSeats} seats for ${req.passengerName}. Available: ${availableSeats}. CHECK constraint violated.`,
        ...prev
      ]);
      return;
    }

    // Perform atomic state change
    const updatedReserved = pool.reservedSeats + req.requestedSeats;
    const isFull = updatedReserved === pool.totalCapacity;
    const newStatus = isFull ? 'DISPATCHED' : 'FORMING';

    setPool({
      ...pool,
      reservedSeats: updatedReserved,
      status: newStatus,
      members: [
        ...pool.members,
        {
          requestId: req.id,
          passengerName: `${req.passengerName} (${req.requestedSeats} seat${req.requestedSeats > 1 ? 's' : ''})`,
          seats: req.requestedSeats,
          pickup: req.pickupName,
          dropoff: req.dropoffName,
          status: 'BOOKED'
        }
      ]
    });

    setRequests(
      requests.map((r) =>
        r.id === req.id ? { ...r, status: 'MATCHED', poolId: pool.id } : r
      )
    );

    setTxLog((prev) => [
      `[ACID COMMIT] SELECT ... FOR UPDATE locked pool-dhaka-01. Booked ${req.requestedSeats} seat(s) for ${req.passengerName}. Remaining seats: ${pool.totalCapacity - updatedReserved}.${isFull ? ' POOL FULL: Transitioned status to DISPATCHED!' : ''}`,
      ...prev
    ]);

    setSimMessage({
      text: `Successfully matched ${req.passengerName}! Reserved ${req.requestedSeats} seat(s). 30% pooling discount applied.`,
      type: 'success'
    });
  };

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassengerName.trim()) return;

    const newReq: SimulatedRideRequest = {
      id: `req-${Date.now().toString().slice(-4)}`,
      passengerName: newPassengerName,
      phone: '+88018' + Math.floor(10000000 + Math.random() * 90000000),
      pickupName: newPickup,
      dropoffName: newDropoff,
      pickupLat: 23.79,
      pickupLng: 90.4,
      dropoffLat: 23.73,
      dropoffLng: 90.41,
      requestedSeats: newSeats,
      status: 'PENDING',
      fareBDT: 300 + newSeats * 150
    };

    setRequests([newReq, ...requests]);
    setNewPassengerName('');
    setTxLog((prev) => [
      `[INSERT INTO ride_requests] New passenger demand: ${newReq.passengerName} (${newReq.requestedSeats} seat(s), ${newPickup} -> ${newDropoff})`,
      ...prev
    ]);
  };

  const handleReset = () => {
    setPool(INITIAL_POOL);
    setRequests(INITIAL_REQUESTS);
    setSimMessage(null);
    setTxLog(['Simulator reset to initial state.']);
  };

  const handleStartTrip = () => {
    setPool((p) => ({ ...p, status: 'IN_PROGRESS' }));
    setTxLog((prev) => [
      '[UPDATE pools] Driver Rafiqul Islam started trip navigation. Status: IN_PROGRESS. Live GPS telemetry streaming via Redis Pub/Sub.',
      ...prev
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-3">
              <Activity className="w-3.5 h-3.5" />
              <span>Interactive Live Simulator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dhaka Tesla Ride-Pooling Simulator
            </h2>
            <p className="mt-2 text-slate-400 text-sm max-w-3xl">
              Experience the 3 actors interacting in real-time: Passenger requests, Driver in Tesla Model 3
              with strict 4-seat capacity, and the Ride/Pool state machine enforcing concurrency rules.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {simMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-medium ${
            simMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : simMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-sky-950/40 border-sky-800 text-sky-300'
          }`}
        >
          {simMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{simMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Tesla Vehicle & Cabin Seating vs Passenger Demands */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tesla Vehicle & Cabin Seating (Actor 2: Driver & Actor 3: Pool) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-600/20 border border-red-500/40 rounded-xl text-red-500">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Tesla Model 3 Cockpit</h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {pool.licensePlate} • Driver: {pool.driverName}
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                  pool.status === 'FORMING'
                    ? 'bg-amber-950/70 text-amber-400 border border-amber-800'
                    : pool.status === 'DISPATCHED'
                    ? 'bg-sky-950/70 text-sky-400 border border-sky-800'
                    : 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                }`}
              >
                {pool.status}
              </span>
            </div>

            {/* Cabin Visualization */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
                <span>INTERIOR SEATING LAYOUT</span>
                <span className="text-red-400 font-bold">
                  {pool.reservedSeats} / {pool.totalCapacity} Seats Booked ({availableSeats} Available)
                </span>
              </div>

              {/* Cabin Grid */}
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                {/* Front Row */}
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-center text-xs">
                  <div className="text-[10px] text-slate-500 font-mono">FRONT LEFT</div>
                  <div className="font-bold text-red-400 mt-1 flex items-center justify-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Driver (Rafiqul)</span>
                  </div>
                </div>

                <div
                  className={`p-3 border rounded-lg text-center text-xs transition ${
                    pool.reservedSeats >= 1
                      ? 'bg-red-950/30 border-red-800 text-red-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="text-[10px] font-mono">FRONT RIGHT</div>
                  <div className="font-bold mt-1">
                    {pool.reservedSeats >= 1 ? 'Seat 1: Reserved' : 'Seat 1: Empty'}
                  </div>
                </div>

                {/* Rear Row */}
                <div
                  className={`p-3 border rounded-lg text-center text-xs transition ${
                    pool.reservedSeats >= 2
                      ? 'bg-red-950/30 border-red-800 text-red-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="text-[10px] font-mono">REAR LEFT</div>
                  <div className="font-bold mt-1">
                    {pool.reservedSeats >= 2 ? 'Seat 2: Reserved' : 'Seat 2: Empty'}
                  </div>
                </div>

                <div
                  className={`p-3 border rounded-lg text-center text-xs transition ${
                    pool.reservedSeats >= 3
                      ? 'bg-red-950/30 border-red-800 text-red-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="text-[10px] font-mono">REAR CENTER</div>
                  <div className="font-bold mt-1">
                    {pool.reservedSeats >= 3 ? 'Seat 3: Reserved' : 'Seat 3: Empty'}
                  </div>
                </div>

                <div
                  className={`col-span-2 p-3 border rounded-lg text-center text-xs transition ${
                    pool.reservedSeats >= 4
                      ? 'bg-red-950/30 border-red-800 text-red-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="text-[10px] font-mono">REAR RIGHT</div>
                  <div className="font-bold mt-1">
                    {pool.reservedSeats >= 4 ? 'Seat 4: Reserved' : 'Seat 4: Empty'}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Manifest */}
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                Active Passengers Manifest ({pool.members.length})
              </h4>
              <div className="space-y-2">
                {pool.members.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{m.passengerName}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1.5">
                        <MapPin className="w-3 h-3 text-red-400" />
                        <span>
                          {m.pickup} → {m.dropoff}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            {pool.status === 'FORMING' && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleStartTrip}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition"
                >
                  <Play className="w-4 h-4" />
                  <span>Dispatch Tesla Early</span>
                </button>
              </div>
            )}
          </div>

          {/* Real-Time Database & Concurrency Log */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-300 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>PostgreSQL Transaction & Concurrency Log</span>
            </div>
            <div className="h-44 overflow-y-auto space-y-1 font-mono text-[10px] text-slate-400 pr-1">
              {txLog.map((log, i) => (
                <div
                  key={i}
                  className={`p-1.5 rounded ${
                    log.includes('ROLLBACK')
                      ? 'bg-rose-950/40 text-rose-300'
                      : log.includes('COMMIT')
                      ? 'bg-emerald-950/30 text-emerald-300'
                      : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Passenger Demands & Pool Matching (Actor 1: Passenger) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Passenger Demands Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-white text-base">Passenger Ride Requests</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {requests.filter((r) => r.status === 'PENDING').length} Pending
              </span>
            </div>

            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={`p-4 rounded-xl border transition ${
                    req.status === 'MATCHED'
                      ? 'bg-slate-950/60 border-slate-850 opacity-75'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-white text-sm">
                        {req.passengerName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {req.phone} • {req.requestedSeats} seat{req.requestedSeats > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        ৳{req.fareBDT} BDT
                      </div>
                      <div className="text-[10px] text-slate-500 line-through">
                        ৳{Math.round(req.fareBDT / 0.7)} BDT
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 mb-3 space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-slate-400">Pickup:</span>
                      <span className="font-medium text-slate-200">{req.pickupName}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-slate-400">Dropoff:</span>
                      <span className="font-medium text-slate-200">{req.dropoffName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-850">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        req.status === 'MATCHED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>

                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => handleMatchRequest(req)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>Match to Tesla Pool</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Create New Passenger Demand Form */}
            <form onSubmit={handleAddRequest} className="mt-6 pt-5 border-t border-slate-800">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
                Simulate New Passenger Ride Request
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Passenger Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asif Mahmud"
                    value={newPassengerName}
                    onChange={(e) => setNewPassengerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Requested Seats</label>
                  <select
                    value={newSeats}
                    onChange={(e) => setNewSeats(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value={1}>1 Seat (Individual)</option>
                    <option value={2}>2 Seats (Pair)</option>
                    <option value={3}>3 Seats (Group)</option>
                    <option value={4}>4 Seats (Full Cabin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Pickup Location</label>
                  <input
                    type="text"
                    value={newPickup}
                    onChange={(e) => setNewPickup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Dropoff Location</label>
                  <input
                    type="text"
                    value={newDropoff}
                    onChange={(e) => setNewDropoff(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Passenger Ride Request</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
