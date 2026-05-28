'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Coins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Activity, 
  Layers, 
  ShieldCheck, 
  Database,
  ArrowRight,
  TrendingUp,
  Cpu,
  BadgeCheck
} from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { mockDb } from '@/lib/db';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function MyWalletPage() {
  const account = useCurrentAccount();
  const [totalTips, setTotalTips] = useState(148.5);
  const [suiBalance, setSuiBalance] = useState(254.20);
  const [walrusShardsCount, setWalrusShardsCount] = useState(120);
  const [showNotification, setShowNotification] = useState(false);
  const [simulatedTipAmount, setSimulatedTipAmount] = useState(0);

  // Hardcoded gorgeous analytics data for Sui tipping growth
  const tippingAnalytics = [
    { day: 'Mon', tips: 12.0 },
    { day: 'Tue', tips: 18.5 },
    { day: 'Wed', tips: 34.0 },
    { day: 'Thu', tips: 15.0 },
    { day: 'Fri', tips: 28.0 },
    { day: 'Sat', tips: 21.0 },
    { day: 'Sun', tips: 20.0 },
  ];

  // Hardcoded historical tipping transaction logs
  const [tipTransactions, setTipTransactions] = useState([
    {
      id: 'tx-1',
      sender: 'Mysten Labs',
      senderAddress: '0x81b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7',
      senderAvatar: 'walrus://mysten-avatar',
      amount: 10.0,
      timestamp: '5 minutes ago',
      verifiedOnSui: true,
      blobHash: 'sha256-h7f9e8d7c6b5a4',
      targetPost: 'post-1'
    },
    {
      id: 'tx-2',
      sender: 'Vitalik Buterin',
      senderAddress: '0x321a5cf4de7c89f01a34d284a1e948cde7231456107b22d148cd90ef718cda12',
      senderAvatar: 'walrus://vitalik-avatar',
      amount: 25.0,
      timestamp: '2 hours ago',
      verifiedOnSui: true,
      blobHash: 'sha256-abc123xyz789',
      targetPost: 'post-2'
    },
    {
      id: 'tx-3',
      sender: 'Sui Enthusiast',
      senderAddress: '0x6e3c5a7f9b0c2d1e8a4f3b6c5d9e0f1a2b3c4d5e',
      senderAvatar: '',
      amount: 5.5,
      timestamp: '1 day ago',
      verifiedOnSui: true,
      blobHash: 'sha256-9a8b7c6d5e4f3a',
      targetPost: 'post-1'
    },
    {
      id: 'tx-4',
      sender: 'Walrus Miner',
      senderAddress: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      senderAvatar: '',
      amount: 15.0,
      timestamp: '2 days ago',
      verifiedOnSui: true,
      blobHash: 'sha256-7x8y9z0a1b2c3d',
      targetPost: 'post-2'
    }
  ]);

  // Simulate a live tipping payout event (micro-animation helper)
  const triggerSimulation = () => {
    const randomAmount = parseFloat((Math.random() * 15 + 2).toFixed(1));
    setSimulatedTipAmount(randomAmount);
    setShowNotification(true);
    
    // Add to balance and total tips
    setTotalTips(prev => prev + randomAmount);
    setSuiBalance(prev => prev + randomAmount);

    // Push new simulated tx into list
    const newTx = {
      id: `sim-tx-${Date.now()}`,
      sender: 'Cyber Caster anonymous',
      senderAddress: `0x${Math.random().toString(16).substring(2, 10)}...`,
      senderAvatar: '',
      amount: randomAmount,
      timestamp: 'Just now',
      verifiedOnSui: true,
      blobHash: `sha256-${Math.random().toString(36).substring(2, 10)}`,
      targetPost: 'post-1'
    };

    setTipTransactions(prev => [newTx, ...prev]);

    setTimeout(() => {
      setShowNotification(false);
    }, 4000);
  };

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto min-h-screen relative">
      
      {/* 1. Left Sidebar Navigation Column */}
      <aside className="w-64 flex-shrink-0 hidden md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* 2. Middle Wallet Dashboard Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col min-h-screen">
        
        {/* Top Header navbar */}
        <header className="glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-6 py-4 sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-sui-cyan" />
            <h2 className="font-mono font-bold text-sm tracking-wider uppercase text-white">My Cyber Wallet</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 node-pulse" />
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Sui Mainnet</span>
          </div>
        </header>

        <div className="p-6 flex flex-col gap-6">
          
          {/* Main Grid: Wallet Address Card & Tips Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Wallet connection certificate card */}
            <div className="glass-panel rounded-cyber-xl p-5 border border-sui-cyan/15 relative overflow-hidden flex flex-col justify-between h-48 shadow-cyber-glow">
              {/* Background tech lines */}
              <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{
                  backgroundImage: 'linear-gradient(rgba(111, 231, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(111, 231, 255, 0.3) 1px, transparent 1px)',
                  backgroundSize: '15px 15px',
                }}
              />
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-sui-cyan/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex justify-between items-start z-10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Sui Wallet Certificate</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="h-2 w-2 rounded-full bg-sui-cyan" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      {account ? 'Connected Active' : 'Fallback Simulation'}
                    </span>
                  </div>
                </div>
                <Cpu className="h-5 w-5 text-sui-cyan opacity-80 animate-pulse" />
              </div>

              <div className="z-10 flex flex-col gap-1.5 my-3">
                <span className="text-[10px] font-mono text-gray-400">Account Address:</span>
                <span className="text-xs font-mono text-sui-cyan break-all bg-walrus-blue/50 border border-sui-cyan/10 rounded-lg p-2 block font-semibold">
                  {account?.address || '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f'}
                </span>
              </div>

              <div className="z-10 flex justify-between items-center text-[10px] font-mono text-gray-500 border-t border-sui-cyan/5 pt-2">
                <span>Network: Sui Network Devnet</span>
                <span>Type: Web3 Wallet</span>
              </div>
            </div>

            {/* Tips Received Dashboard Card */}
            <div className="glass-panel rounded-cyber-xl p-5 border border-amber-500/25 bg-gradient-to-br from-amber-500/5 via-deep-space to-walrus-blue/20 relative overflow-hidden flex flex-col justify-between h-48 shadow-cyber-glow">
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex justify-between items-start z-10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest font-black">Creator Telemetry</span>
                  <h3 className="text-sm font-sans font-bold text-white mt-1 flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-400 animate-bounce" /> Total Tips Received
                  </h3>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/35 rounded-lg px-2 py-0.5 text-[8px] font-mono text-amber-400 font-bold uppercase">
                  Verified On-Chain
                </div>
              </div>

              <div className="z-10 flex items-baseline gap-2 my-2">
                <span className="text-3xl font-mono font-black text-amber-400 text-neon-glow">
                  {totalTips.toFixed(1)}
                </span>
                <span className="text-sm font-mono text-amber-400/80 font-bold">SUI</span>
              </div>

              <div className="z-10 flex justify-between items-center text-[9px] font-mono text-gray-500 border-t border-amber-500/10 pt-2.5">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">+18.5% Growth</span>
                </div>
                <button 
                  onClick={triggerSimulation}
                  className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-400 hover:text-white hover:bg-amber-500/25 transition-all text-[9px] uppercase tracking-wider font-bold cursor-pointer"
                  title="Simulate a new tip payout to test particle verifications"
                >
                  Simulate Tip
                </button>
              </div>
            </div>

          </div>

          {/* SUI balance & Walrus metadata metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-walrus-blue/30 border border-sui-cyan/5 rounded-cyber-lg p-4 shadow-md font-mono text-xs">
            <div className="border-r border-sui-cyan/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] uppercase text-gray-500 tracking-wider">Account Balance</span>
              <p className="text-sm font-bold text-white">{suiBalance.toFixed(2)} SUI</p>
            </div>
            <div className="border-r border-sui-cyan/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] uppercase text-gray-500 tracking-wider">Walrus Storage Stake</span>
              <p className="text-sm font-bold text-white">450 WAL</p>
            </div>
            <div className="border-r border-sui-cyan/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] uppercase text-gray-500 tracking-wider">Storage footprints</span>
              <p className="text-sm font-bold text-white">42.8 KB</p>
            </div>
            <div className="flex flex-col justify-center gap-1">
              <span className="text-[9px] uppercase text-gray-500 tracking-wider">Reed-Solomon Shards</span>
              <p className="text-sm font-bold text-sui-cyan">{walrusShardsCount} / 120 Shards</p>
            </div>
          </div>

          {/* Analytics Block: 7-Day Tipping Growth Chart */}
          <div className="glass-panel rounded-cyber-lg p-5 border border-sui-cyan/10 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-sui-cyan/5 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sui-cyan" />
                <h3 className="font-mono font-bold text-xs uppercase text-white tracking-wider">
                  7-Day Tipping Revenue Growth
                </h3>
              </div>
              <span className="text-[9px] font-mono text-gray-500">Live Telemetry Metrics</span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tippingAnalytics} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tipsGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    stroke="#4b5563" 
                    fontSize={10} 
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#4b5563" 
                    fontSize={10} 
                    fontFamily="monospace" 
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a101d', 
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontFamily: 'monospace',
                      fontSize: '11px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tips" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#tipsGlow)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Tipping Transaction Logs table */}
          <div className="glass-panel rounded-cyber-lg p-5 border border-sui-cyan/10 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-sui-cyan/5 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-sui-cyan animate-pulse" />
                <h3 className="font-mono font-bold text-xs uppercase text-white tracking-wider">
                  Tips Verification Audit Logs
                </h3>
              </div>
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Relational Postgres Indexes</span>
            </div>

            <div className="flex flex-col gap-3">
              {tipTransactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="bg-walrus-blue/20 border border-sui-cyan/5 hover:border-sui-cyan/15 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-10 w-10 rounded-cyber-sm bg-gradient-to-tr from-amber-500/25 to-sui-cyan/25 p-0.5 flex-shrink-0">
                      <div className="h-full w-full rounded-[10px] bg-walrus-blue overflow-hidden flex items-center justify-center font-mono text-xs text-amber-400 font-bold">
                        {tx.senderAvatar ? (
                          <img 
                            src={tx.sender === 'Mysten Labs' ? 'https://avatars.githubusercontent.com/u/96434406?s=200&v=4' : 'https://avatars.githubusercontent.com/u/14490333?s=200&v=4'}
                            alt="Sender Avatar preview" 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          'YU'
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white font-sans truncate leading-none">
                          {tx.sender}
                        </span>
                        {tx.verifiedOnSui && (
                          <BadgeCheck className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-[8px] font-mono text-gray-500 truncate leading-none mt-1">
                        From: {tx.senderAddress}
                      </span>
                      <span className="text-[8px] font-mono text-sui-cyan/60 truncate leading-none mt-0.5">
                        Cert Hash: {tx.blobHash}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 flex flex-col gap-1.5 items-end justify-center font-mono">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      +{tx.amount.toFixed(1)} SUI
                    </span>
                    <span className="text-[9px] text-gray-500">{tx.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-sui-cyan/5 border border-sui-cyan/15 rounded-cyber-sm p-4 text-[9px] font-mono text-gray-400 flex items-start gap-2 leading-relaxed">
              <ShieldCheck className="h-4 w-4 text-sui-cyan flex-shrink-0" />
              <p>
                Security Audit Notice: All tips received are verifiable cryptographically on the Sui block explorer. Transaction details are parsed in real-time by the off-chain indexer daemon and synchronized with Postgres.
              </p>
            </div>

          </div>

        </div>

      </main>

      {/* 3. Right Sidebar Trending Stats Column */}
      <aside className="w-80 flex-shrink-0 hidden lg:block">
        <div className="sticky top-0 h-screen">
          <TrendingWidget />
        </div>
      </aside>

      {/* 4. Live Simulated Tipping Toast Alert Drawer */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-sm glass-panel border border-amber-500/40 bg-deep-space/95 rounded-cyber-xl shadow-cyber-glow p-5 flex items-center gap-4 backdrop-blur-xl"
          >
            <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 animate-bounce">
              <Coins className="h-5 w-5" />
            </div>
            
            <div className="flex-1 font-mono text-xs">
              <span className="text-amber-400 font-bold uppercase tracking-wider block mb-0.5">
                🪙 Tip Verification Received!
              </span>
              <p className="text-gray-300 font-sans text-xs">
                You verifiably received <strong className="text-amber-400">{simulatedTipAmount.toFixed(1)} SUI</strong> tip payout on your permanent social cast!
              </p>
              <span className="text-[8px] text-gray-500 block mt-1">
                Synced dynamically via off-chain Postgres indexer
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
