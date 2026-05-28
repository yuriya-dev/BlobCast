'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, 
  Activity, 
  Cpu, 
  Database, 
  Search, 
  RefreshCw, 
  Server, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { tatum, TatumNodeStats } from '@/lib/tatum';
import { walrus, WalrusBlobInfo } from '@/lib/walrus';

// Initial dummy latency history for Tatum RPC
const initialLatencyData = [
  { name: '10:00', latency: 45 },
  { name: '10:05', latency: 48 },
  { name: '10:10', latency: 42 },
  { name: '10:15', latency: 55 },
  { name: '10:20', latency: 38 },
  { name: '10:25', latency: 44 },
];

export default function DevDiagnosticsPage() {
  // Tatum State
  const [tatumStats, setTatumStats] = useState<TatumNodeStats | null>(null);
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('testnet');
  const [latencyHistory, setLatencyHistory] = useState<Array<{ name: string; latency: number }>>(initialLatencyData);
  const [isRefreshingRpc, setIsRefreshingRpc] = useState(false);

  // Walrus State
  const [searchBlobId, setSearchBlobId] = useState('walrus_sim_yuriya_post_001');
  const [blobInfo, setBlobInfo] = useState<WalrusBlobInfo | null>(null);
  const [outageNodes, setOutageNodes] = useState<number[]>([]); // Array of node IDs simulated offline
  const [isAnalyzingBlob, setIsAnalyzingBlob] = useState(false);

  // Measure Tatum diagnostics on mount
  useEffect(() => {
    fetchTatumStats();
    // Auto-ping Tatum RPC every 8 seconds
    const interval = setInterval(() => {
      pingTatumRpc();
    }, 8000);
    return () => clearInterval(interval);
  }, [network]);

  // Load initial simulated/searched blob
  useEffect(() => {
    inspectBlob();
  }, []);

  const fetchTatumStats = async () => {
    setIsRefreshingRpc(true);
    const stats = await tatum.measureDiagnostics(network);
    setTatumStats(stats);
    setIsRefreshingRpc(false);
  };

  const pingTatumRpc = async () => {
    const stats = await tatum.measureDiagnostics(network);
    setTatumStats(stats);
    
    // Add to latency history
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLatencyHistory(prev => {
      const next = [...prev.slice(1), { name: timeStr, latency: stats.latencyMs }];
      return next;
    });
  };

  const inspectBlob = () => {
    setIsAnalyzingBlob(true);
    setTimeout(() => {
      const info = walrus.getBlobDetails(searchBlobId, 45280);
      setBlobInfo(info);
      setIsAnalyzingBlob(false);
    }, 600);
  };

  // Toggle dynamic mock node outage state to demonstrate Reed-Solomon reconstruction!
  const toggleNodeOutage = (nodeId: number) => {
    setOutageNodes(prev => 
      prev.includes(nodeId) 
        ? prev.filter(id => id !== nodeId) 
        : [...prev, nodeId]
    );
  };

  const recoverAllNodes = () => {
    setOutageNodes([]);
  };

  // Compute Reed-Solomon Shard Reconstruction Status
  // Walrus requires >= 1/3 of shards (e.g. 40 shards) to fully reconstruct content.
  const activeNodesCount = blobInfo ? blobInfo.shardsMap.length - outageNodes.length : 0;
  const activeShardsCount = blobInfo 
    ? blobInfo.shardsMap.reduce((acc, node) => {
        if (outageNodes.includes(node.nodeId)) return acc;
        return acc + node.shards.length;
      }, 0)
    : 0;

  const reconstructionThreshold = 40; // minimum required shards
  const isDataRecoverable = activeShardsCount >= reconstructionThreshold;

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full z-10">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-sui-cyan/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-sui-cyan animate-pulse" />
            <h1 className="text-3xl font-bold tracking-tight text-neon-glow font-mono text-sui-cyan">
              BLOBCAST.DIAGNOSTICS
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Real-time latency monitoring, enterprise Tatum RPC stats, and Walrus Reed-Solomon blob visualizer.
          </p>
        </div>

        {/* Network Switcher */}
        <div className="flex items-center gap-1 bg-walrus-blue/60 p-1 rounded-xl border border-sui-cyan/15">
          <button 
            onClick={() => setNetwork('testnet')}
            className={`px-4 py-2 rounded-lg text-xs font-mono transition-all ${network === 'testnet' ? 'bg-sui-cyan/20 text-sui-cyan border border-sui-cyan/20' : 'text-gray-400 hover:text-white'}`}
          >
            SUI TESTNET
          </button>
          <button 
            onClick={() => setNetwork('mainnet')}
            className={`px-4 py-2 rounded-lg text-xs font-mono transition-all ${network === 'mainnet' ? 'bg-tatum-purple/20 text-tatum-purple border border-tatum-purple/20' : 'text-gray-400 hover:text-white'}`}
          >
            SUI MAINNET
          </button>
        </div>
      </div>

      {/* Grid Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Tatum RPC Performance Monitoring */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-6 relative overflow-hidden"
          >
            {/* Ambient Purple glow in card */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-tatum-purple/10 rounded-full blur-2xl" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-tatum-purple" />
                <h2 className="text-lg font-bold font-mono text-tatum-purple">Tatum RPC Node</h2>
              </div>
              <button 
                onClick={fetchTatumStats}
                disabled={isRefreshingRpc}
                className="text-gray-400 hover:text-tatum-purple transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingRpc ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {tatumStats ? (
              <div className="flex flex-col gap-4">
                {/* Latency big metric */}
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-mono text-gray-500 block uppercase">Gateway Latency</span>
                    <span className="text-4xl font-bold font-mono tracking-tight text-white">
                      {tatumStats.latencyMs}<span className="text-lg font-light text-tatum-purple">ms</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 node-pulse" />
                    ONLINE
                  </div>
                </div>

                {/* Stats list */}
                <div className="grid grid-cols-2 gap-4 mt-2 border-t border-sui-cyan/5 pt-4">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-gray-500">Provider</span>
                    <p className="text-sm font-semibold text-soft-white mt-0.5">{tatumStats.provider}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-gray-500">Checkpoints</span>
                    <p className="text-sm font-mono text-soft-white mt-0.5">{tatumStats.blocksProcessed.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-mono text-gray-500">Endpoint Cluster</span>
                    <p className="text-xs font-mono text-gray-400 truncate mt-0.5">{tatumStats.endpoint}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center">
                <div className="animate-pulse text-gray-500 text-sm">Initializing Tatum RPC telemetry...</div>
              </div>
            )}
          </motion.div>

          {/* Recharts RPC Latency Graph */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-3xl p-6 flex-1 flex flex-col min-h-[300px]"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-sui-cyan" />
              <h2 className="text-lg font-bold font-mono">Telemetry Log (Ping ms)</h2>
            </div>
            
            <div className="flex-1 w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyHistory} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6FE7FF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6FE7FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#4B5563" fontSize={10} tickLine={false} />
                  <YAxis stroke="#4B5563" fontSize={10} tickLine={false} domain={[0, 150]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B1F33', border: '1px solid rgba(111, 231, 255, 0.2)', borderRadius: '12px' }}
                    labelStyle={{ color: '#9CA3AF', fontFamily: 'monospace' }}
                  />
                  <Area type="monotone" dataKey="latency" stroke="#6FE7FF" strokeWidth={2} fillOpacity={1} fill="url(#latencyGlow)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: Walrus Reed-Solomon Erasure Coding Shard Inspector */}
        <div className="lg:col-span-7">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-3xl p-6 flex flex-col h-full gap-6 relative"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-sui-cyan/5 rounded-full blur-2xl" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-sui-cyan" />
                <h2 className="text-lg font-bold font-mono">Walrus Storage Node Shard Inspector</h2>
              </div>
              
              {/* Shard inspection input */}
              <div className="flex items-center gap-2 border border-sui-cyan/20 bg-walrus-blue/40 px-3 py-1.5 rounded-2xl w-full md:w-80">
                <Search className="h-4 w-4 text-gray-500" />
                <input 
                  type="text" 
                  value={searchBlobId}
                  onChange={(e) => setSearchBlobId(e.target.value)}
                  className="bg-transparent border-none text-xs text-soft-white placeholder-gray-500 outline-none w-full font-mono"
                  placeholder="walrus_sim_..."
                />
                <button 
                  onClick={inspectBlob}
                  disabled={isAnalyzingBlob}
                  className="text-sui-cyan hover:text-white transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzingBlob ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {blobInfo ? (
              <div className="flex flex-col gap-6">
                
                {/* Reed-Solomon Health Dashboard Card */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  !isDataRecoverable 
                    ? 'bg-rose-500/5 border-rose-500/20' 
                    : outageNodes.length > 0 
                      ? 'bg-amber-500/5 border-amber-500/20' 
                      : 'bg-emerald-500/5 border-emerald-500/20'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {!isDataRecoverable ? (
                        <XCircle className="h-8 w-8 text-rose-400" />
                      ) : outageNodes.length > 0 ? (
                        <AlertTriangle className="h-8 w-8 text-amber-400" />
                      ) : (
                        <ShieldCheck className="h-8 w-8 text-emerald-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-mono tracking-wider font-semibold text-gray-400">
                          Decentralized Erasure Coding (Reed-Solomon 2/3 Redundancy)
                        </span>
                        {outageNodes.length > 0 && (
                          <button 
                            onClick={recoverAllNodes}
                            className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sui-cyan/10 text-sui-cyan hover:bg-sui-cyan/20 border border-sui-cyan/20 transition-all"
                          >
                            Recover System Nodes
                          </button>
                        )}
                      </div>

                      <div className="mt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="text-xl font-bold font-mono text-soft-white">
                            {activeShardsCount} / {blobInfo.shardsCount} Active Shards
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {!isDataRecoverable 
                              ? 'CRITICAL outage: Insufficient shards to reconstruct file. Outage exceeds maximum limit.' 
                              : outageNodes.length > 0 
                                ? 'degraded state: System successfully recovered data in real-time using Reed-Solomon math!' 
                                : 'system optimal: Shards distributed evenly across worldwide server nodes.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] block text-gray-500 uppercase font-mono">Min Threshold</span>
                            <span className="text-sm font-bold font-mono text-sui-cyan">40 Shards</span>
                          </div>
                          <div className="h-8 w-px bg-sui-cyan/10" />
                          <div className="text-right">
                            <span className="text-[10px] block text-gray-500 uppercase font-mono">Reconstruction</span>
                            <span className={`text-sm font-bold font-mono ${isDataRecoverable ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isDataRecoverable ? 'SECURE' : 'FAIL'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shards Node List */}
                <div>
                  <h3 className="text-xs uppercase font-mono text-gray-400 tracking-wider mb-3">
                    Active Storage Node Registry ({activeNodesCount} / {blobInfo.shardsMap.length} Online)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {blobInfo.shardsMap.map((node) => {
                      const isOffline = outageNodes.includes(node.nodeId);
                      return (
                        <div 
                          key={node.nodeId}
                          onClick={() => toggleNodeOutage(node.nodeId)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between h-32 ${
                            isOffline 
                              ? 'bg-rose-500/5 border-rose-500/20 opacity-60 hover:opacity-85' 
                              : 'bg-walrus-blue/40 border-sui-cyan/5 hover:border-sui-cyan/25 hover:bg-walrus-blue/60'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Server className={`h-4 w-4 ${isOffline ? 'text-rose-400' : 'text-sui-cyan'}`} />
                                <span className="font-mono text-sm font-semibold text-soft-white">{node.nodeName}</span>
                              </div>
                              <span className="text-[10px] font-mono text-gray-400 block mt-0.5">{node.location}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                isOffline 
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {isOffline ? 'OFFLINE' : `${node.latencyMs}ms`}
                              </span>
                            </div>
                          </div>

                          {/* Shard map visual bars */}
                          <div className="mt-3">
                            <span className="text-[9px] font-mono text-gray-500 block mb-1">
                              Erasure-Coding Shards: {node.shards[0]}-{node.shards[node.shards.length - 1]}
                            </span>
                            <div className="flex gap-0.5">
                              {node.shards.map((shard) => (
                                <div 
                                  key={shard}
                                  className={`h-2 flex-1 rounded-sm transition-all ${
                                    isOffline 
                                      ? 'bg-rose-500/30' 
                                      : 'bg-sui-cyan/50 hover:bg-sui-cyan'
                                  }`}
                                  title={`Shard #${shard}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic On-chain Event log references */}
                <div className="mt-2 border-t border-sui-cyan/5 pt-4">
                  <span className="text-xs uppercase font-mono text-gray-400 block mb-3">Live On-chain Event Stream</span>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-walrus-blue/40 border border-sui-cyan/5 rounded-xl px-4 py-2.5 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-sui-cyan">Event::PostCreated</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-400">0x91abc6f3e1b7...</span>
                      </div>
                      <a href="#" className="text-sui-cyan hover:text-white flex items-center gap-1">
                        Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between bg-walrus-blue/40 border border-sui-cyan/5 rounded-xl px-4 py-2.5 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-tatum-purple">Event::TippingDone</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-400">0x321a5cf4de7c...</span>
                      </div>
                      <a href="#" className="text-sui-cyan hover:text-white flex items-center gap-1">
                        Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-pulse text-gray-500 text-sm">Analyzing blob shards replication states...</div>
              </div>
            )}

          </motion.div>
        </div>

      </div>

    </div>
  );
}
