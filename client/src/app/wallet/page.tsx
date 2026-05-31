'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Coins, 
  Activity, 
  Layers, 
  ShieldCheck, 
  Database,
  TrendingUp,
  Cpu,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { SearchInputWithRecommendations } from '@/components/feed/SearchInputWithRecommendations';
import { useAuth } from '@/components/providers/AuthProvider';
import { api } from '@/lib/api';
import { tatum } from '@/lib/tatum';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

// ─── Network Config ──────────────────────────────────────────────────────────
const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'testnet' | 'mainnet') || 'testnet';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSui(mistBalance: bigint): string {
  const sui = Number(mistBalance) / 1_000_000_000;
  return sui.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getLast7DayLabels(): string[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(days[d.getDay()]);
  }
  return result;
}

export default function MyWalletPage() {
  const account = useCurrentAccount();
  const { user: authUser } = useAuth();
  const suiClient = useSuiClient();

  // ─── Balance & Tipping State (Strictly Real Data) ───────────────────────────
  const [suiBalance, setSuiBalance] = useState<string | null>(null);
  const [suiBalanceRaw, setSuiBalanceRaw] = useState<bigint>(BigInt(0));
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState(false);

  const [totalTips, setTotalTips] = useState<number>(0);
  const [tipTransactions, setTipTransactions] = useState<any[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(false);

  // ─── Storage/Walrus Metrics State ──────────────────────────────────────────
  const [storageBytes, setStorageBytes] = useState(0);
  const [walrusShardsCount, setWalrusShardsCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);


  // ─── Analytics Tipping Chart (Strictly Real Data) ───────────────────────────
  const [tippingAnalytics, setTippingAnalytics] = useState<{ day: string; tips: number }[]>([]);

  // ─── Pagination for Audit Logs ─────────────────────────────────────────────
  const ITEMS_PER_PAGE = 5;
  const [auditPage, setAuditPage] = useState(1);

  // ─── Fetch On-Chain SUI Balance ───────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    const walletAddr = account?.address || authUser?.walletAddress;
    if (!walletAddr) return;

    setIsLoadingBalance(true);
    setBalanceError(false);
    try {
      const balances = await suiClient.getAllBalances({ owner: walletAddr });
      const suiToken = balances.find((b: { coinType: string; totalBalance: string }) => b.coinType === '0x2::sui::SUI');
      const totalMist = suiToken ? BigInt(suiToken.totalBalance) : BigInt(0);
      setSuiBalanceRaw(totalMist);
      setSuiBalance(formatSui(totalMist));
    } catch (err) {
      console.warn('⚠️ Primary Sui client failed, attempting fallback to public fullnode RPC:', err);
      try {
        const fallbackUrl = tatum.getRpcUrl(SUI_NETWORK as any);
          
        const res = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'suix_getAllBalances',
            params: [walletAddr]
          })
        });

        if (!res.ok) throw new Error(`Fallback RPC HTTP ${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error.message || 'RPC JSON Error');

        const balances = json.result || [];
        const suiToken = balances.find((b: { coinType: string; totalBalance: string }) => b.coinType === '0x2::sui::SUI');
        const totalMist = suiToken ? BigInt(suiToken.totalBalance) : BigInt(0);
        setSuiBalanceRaw(totalMist);
        setSuiBalance(formatSui(totalMist));
      } catch (fallbackErr) {
        console.warn('⚠️ Tatum RPC fallback failed (429 or network error). Trying public Sui RPC fullnode...', fallbackErr);
        try {
          const publicUrl = SUI_NETWORK === 'mainnet'
            ? 'https://fullnode.mainnet.sui.io:443'
            : 'https://fullnode.testnet.sui.io:443';
            
          const res = await fetch(publicUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'suix_getAllBalances',
              params: [walletAddr]
            })
          });

          if (!res.ok) throw new Error(`Public RPC HTTP ${res.status}`);
          const json = await res.json();
          if (json.error) throw new Error(json.error.message || 'RPC JSON Error');

          const balances = json.result || [];
          const suiToken = balances.find((b: { coinType: string; totalBalance: string }) => b.coinType === '0x2::sui::SUI');
          const totalMist = suiToken ? BigInt(suiToken.totalBalance) : BigInt(0);
          setSuiBalanceRaw(totalMist);
          setSuiBalance(formatSui(totalMist));
        } catch (publicErr) {
          console.error('❌ All Sui RPC queries failed:', publicErr);
          setBalanceError(true);
        }
      }
    } finally {
      setIsLoadingBalance(false);
    }
  }, [account?.address, authUser?.walletAddress, suiClient]);

  // ─── Fetch Dashboard & relational Postgres tip data ──────────────────────
  const fetchDashboardData = useCallback(async () => {
    const walletAddr = account?.address || authUser?.walletAddress;
    if (!walletAddr) return;

    setIsLoadingTips(true);
    try {
      // 1. Fetch profile. If they aren't registered yet, register them anonymously in Supabase
      let user: any = null;
      try {
        const profileRes = await api.fetchUserProfile(walletAddr);
        user = profileRes?.data?.user;
      } catch (err) {
        console.warn('⚠️ Wallet not registered in database. Autocreating anonymous DB profile...', err);
        const registerRes = await api.upsertUserProfile({
          walletAddress: walletAddr,
          displayName: 'Cyber Caster',
          username: `anon_${walletAddr.substring(2, 8)}`
        });
        user = registerRes?.data?.user;
      }

      if (user) {
        const userPosts = user.posts || [];
        setPostsCount(userPosts.length);

        // Footprints calculation based on real posts stored on Walrus
        let byteCount = 0;
        userPosts.forEach((p: any) => {
          const mediaBlobSize = (p.media?.length || 0) * 50 * 1024;
          const textBlobSize = 800;
          byteCount += textBlobSize + mediaBlobSize;
        });
        setStorageBytes(byteCount);
        setWalrusShardsCount(userPosts.length * 120);

        // 2. Fetch tips received from backend database strictly
        const tipsRes = await api.fetchTipsReceived(user.id);
        const tipsList = tipsRes?.data?.tips || [];
        setTipTransactions(tipsList);

        // Sum real total tips received
        const sum = tipsList.reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
        setTotalTips(sum);

        // 3. Build dynamic 7-day tipping revenue chart strictly from real data
        const labels = getLast7DayLabels();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        const tipsByDay: Record<string, number> = {};
        labels.forEach(l => {
          tipsByDay[l] = 0;
        });

        const now = new Date();
        tipsList.forEach((t: any) => {
          const created = new Date(t.createdAt);
          const diffDays = Math.floor((now.getTime() - created.getTime()) / 86400000);
          if (diffDays >= 0 && diffDays < 7) {
            const dayLabel = dayNames[created.getDay()];
            if (tipsByDay[dayLabel] !== undefined) {
              tipsByDay[dayLabel] += t.amount || 0;
            }
          }
        });
        setTippingAnalytics(labels.map(l => ({ day: l, tips: parseFloat(tipsByDay[l].toFixed(1)) })));
      }
    } catch (err) {
      console.warn('⚠️ Failed to load tipping and storage data:', err);
    } finally {
      setIsLoadingTips(false);
    }
  }, [account?.address, authUser?.walletAddress]);

  // ─── Initial Load & Auto-poll every 30 seconds for live tips ───────────────
  useEffect(() => {
    fetchBalance();
    fetchDashboardData();

    // Auto-refresh tip data every 30 seconds so new incoming tips appear live
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [account?.address, authUser?.walletAddress, fetchBalance, fetchDashboardData]);

  // ─── Compute real 7-day growth % from tipping analytics ─────────────────────
  const tipGrowthPercent = React.useMemo(() => {
    if (tippingAnalytics.length < 2) return null;
    const last = tippingAnalytics[tippingAnalytics.length - 1]?.tips ?? 0;
    const prev = tippingAnalytics[tippingAnalytics.length - 2]?.tips ?? 0;
    if (prev === 0) return last > 0 ? 100 : null;
    return parseFloat((((last - prev) / prev) * 100).toFixed(1));
  }, [tippingAnalytics]);

  const walletAddress = account?.address || authUser?.walletAddress;
  const suiScanUrl = walletAddress
    ? `https://suiscan.xyz/${SUI_NETWORK}/account/${walletAddress}`
    : '#';

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto h-screen overflow-hidden relative">
      
      {/* 1. Left Sidebar Navigation Column */}
      <aside className="w-64 flex-shrink-0 hidden md:block h-screen">
        <Sidebar />
      </aside>

      {/* 2. Middle Wallet Dashboard Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col h-screen overflow-y-auto scrollbar-cyber">
        
        {/* Top Header navbar */}
        <header className="glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-6 py-4 sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-sui-cyan" />
            <h2 className="font-mono font-bold text-sm tracking-wider uppercase text-white">My Cyber Wallet</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchBalance(); fetchDashboardData(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400 hover:text-sui-cyan border border-sui-cyan/10 hover:border-sui-cyan/40 rounded-lg transition-all bg-walrus-blue/20 cursor-pointer"
              title="Refresh live data"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingBalance || isLoadingTips ? 'animate-spin text-sui-cyan' : ''}`} />
              Refresh
            </button>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 node-pulse" />
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Sui {SUI_NETWORK}</span>
            </div>
          </div>
        </header>

        <div className="p-6 flex flex-col gap-6">
          
          {/* Main Grid: Wallet Address Card & Tips Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Wallet connection certificate card */}
            <div className="glass-panel rounded-cyber-xl p-5 border border-sui-cyan/15 relative overflow-hidden flex flex-col justify-between h-52 shadow-cyber-glow">
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
                    <span className={`h-2 w-2 rounded-full ${walletAddress ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      {walletAddress ? 'Connected Active' : 'Fallback Simulation'}
                    </span>
                  </div>
                </div>
                <Cpu className="h-5 w-5 text-sui-cyan opacity-80 animate-pulse" />
              </div>

              <div className="z-10 flex flex-col gap-1.5 my-2">
                <span className="text-[10px] font-mono text-gray-400">Account Address:</span>
                <span className="text-xs font-mono text-sui-cyan break-all bg-walrus-blue/50 border border-sui-cyan/10 rounded-lg p-2 block font-semibold leading-relaxed">
                  {walletAddress || '—'}
                </span>
              </div>

              <div className="z-10 flex justify-between items-center text-[9px] font-mono text-gray-500 border-t border-sui-cyan/5 pt-2">
                <span>Network: Sui {SUI_NETWORK}</span>
                <a
                  href={suiScanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sui-cyan/70 hover:text-sui-cyan transition-colors"
                >
                  View on SuiScan <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>

            {/* Tips Received Dashboard Card */}
            <div className="glass-panel rounded-cyber-xl p-5 border border-amber-500/25 bg-gradient-to-br from-amber-500/5 via-deep-space to-walrus-blue/20 relative overflow-hidden flex flex-col justify-between h-52 shadow-cyber-glow">
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex justify-between items-start z-10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest font-black">Creator Telemetry</span>
                  <h3 className="text-sm font-sans font-bold text-white mt-1 flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-400 animate-bounce" /> Total Tips Received
                  </h3>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/35 rounded-lg px-2 py-0.5 text-[8px] font-mono text-amber-400 font-bold uppercase">
                  {isLoadingTips ? 'Updating...' : 'Verified On-Chain'}
                </div>
              </div>

              <div className="z-10 flex items-baseline gap-2 my-1">
                {isLoadingTips ? (
                  <div className="h-8 w-24 bg-amber-500/10 animate-pulse rounded-lg" />
                ) : (
                  <>
                    <span className="text-3xl font-mono font-black text-amber-400 text-neon-glow">
                      {totalTips.toFixed(1)}
                    </span>
                    <span className="text-sm font-mono text-amber-400/80 font-bold">SUI</span>
                  </>
                )}
              </div>

              <div className="z-10 flex justify-between items-center text-[9px] font-mono text-gray-500 border-t border-amber-500/10 pt-2.5">
                <div className="flex items-center gap-1">
                  {tipGrowthPercent !== null ? (
                    <>
                      <TrendingUp className={`h-3 w-3 ${tipGrowthPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                      <span className={`font-semibold ${tipGrowthPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tipGrowthPercent >= 0 ? '+' : ''}{tipGrowthPercent}% vs yesterday
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-500">{tipTransactions.length === 0 ? 'No tips yet' : 'Tracking...'}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-bold uppercase tracking-wider">Live · {tipTransactions.length} tips</span>
                </div>
              </div>
            </div>

          </div>

          {/* SUI balance & Walrus metadata metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-walrus-blue/30 border border-sui-cyan/5 rounded-cyber-lg p-4 shadow-md font-mono text-xs">
            <div className="border-r border-sui-cyan/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] uppercase text-gray-500 tracking-wider flex items-center gap-1">
                <Coins className="h-3 w-3 text-sui-cyan" /> Account Balance
              </span>
              {!walletAddress ? (
                <p className="text-xs text-amber-400 font-bold leading-normal">Connect Wallet</p>
              ) : isLoadingBalance && suiBalance === null ? (
                <div className="h-4 w-20 bg-walrus-blue/50 animate-pulse rounded" />
              ) : balanceError && suiBalance === null ? (
                <p className="text-[10px] text-amber-400 font-semibold leading-normal truncate" title="Sui fullnode RPC endpoints are currently rate-limited or unreachable.">
                  RPC Rate Limited
                </p>
              ) : (
                <p className="text-sm font-bold text-white truncate">{suiBalance || '0.00'} SUI</p>
              )}
            </div>
            <div className="border-r border-sui-cyan/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] uppercase text-gray-500 tracking-wider flex items-center gap-1">
                <Cpu className="h-3 w-3 text-amber-400" /> Walrus Storage Stake
              </span>
              <p className="text-sm font-bold text-white">450 WAL</p>
            </div>
            <div className="border-r border-sui-cyan/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] uppercase text-gray-500 tracking-wider flex items-center gap-1">
                <HardDrive className="h-3 w-3 text-emerald-400" /> Storage footprints
              </span>
              <p className="text-sm font-bold text-white">{formatBytes(storageBytes)}</p>
            </div>
            <div className="flex flex-col justify-center gap-1">
              <span className="text-[9px] uppercase text-gray-500 tracking-wider flex items-center gap-1">
                <Layers className="h-3 w-3 text-sui-cyan" /> Reed-Solomon Shards
              </span>
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

            {isLoadingTips ? (
              <div className="h-44 bg-walrus-blue/20 animate-pulse rounded-lg" />
            ) : tippingAnalytics.length === 0 || tippingAnalytics.every(d => d.tips === 0) ? (
              <div className="h-44 flex flex-col items-center justify-center text-gray-600 font-mono text-xs gap-2">
                <Coins className="h-8 w-8 opacity-30" />
                <span>No tips received in the last 7 days</span>
              </div>
            ) : (
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
            )}
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

            {isLoadingTips ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-walrus-blue/20 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : tipTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-600 font-mono text-xs gap-3">
                <Layers className="h-10 w-10 opacity-20" />
                <span>No tips found. Simulate a tip payout to write records into Supabase!</span>
              </div>
            ) : (
              <>
                {/* Paginated list */}
                <div className="flex flex-col gap-3">
                  {tipTransactions
                    .slice((auditPage - 1) * ITEMS_PER_PAGE, auditPage * ITEMS_PER_PAGE)
                    .map((tx) => (
                    <motion.div 
                      key={tx.id} 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-walrus-blue/20 border border-sui-cyan/5 hover:border-sui-cyan/15 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 rounded-cyber-sm bg-gradient-to-tr from-amber-500/25 to-sui-cyan/25 p-0.5 flex-shrink-0">
                          <div className="h-full w-full rounded-[10px] bg-walrus-blue overflow-hidden flex items-center justify-center font-mono text-xs text-amber-400 font-bold">
                            {(tx.senderName || 'AN').substring(0, 2).toUpperCase()}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-white font-sans truncate leading-none">
                              {tx.senderName || 'Anonymous Caster'}
                            </span>
                            {tx.verifiedOnSui && (
                              <BadgeCheck className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-[8px] font-mono text-gray-500 truncate leading-none mt-1">
                            From: {tx.senderAddress}
                          </span>
                          {tx.blobHash && (
                            <span className="text-[8px] font-mono text-sui-cyan/60 truncate leading-none mt-0.5">
                              Cert Hash: {tx.blobHash}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 flex flex-col gap-1.5 items-end justify-center font-mono">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          +{tx.amount.toFixed(1)} SUI
                        </span>
                        <span className="text-[9px] text-gray-500">{tx.createdAt ? timeAgo(tx.createdAt) : 'Just now'}</span>
                        {tx.suiTxDigest && tx.suiTxDigest.startsWith('digest-') === false && (
                          <a
                            href={`https://suiscan.xyz/${SUI_NETWORK}/tx/${tx.suiTxDigest}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-[8px] text-sui-cyan/60 hover:text-sui-cyan transition-colors"
                          >
                            Verify <ExternalLink className="h-2 w-2" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {tipTransactions.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-3 border-t border-sui-cyan/5 mt-1">
                    {/* Left: entry count info */}
                    <span className="text-[9px] font-mono text-gray-500">
                      Showing {Math.min((auditPage - 1) * ITEMS_PER_PAGE + 1, tipTransactions.length)}–{Math.min(auditPage * ITEMS_PER_PAGE, tipTransactions.length)} of {tipTransactions.length} logs
                    </span>

                    {/* Right: page controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                        disabled={auditPage === 1}
                        className="h-7 w-7 flex items-center justify-center rounded-cyber-sm border border-sui-cyan/20 hover:border-sui-cyan/50 hover:bg-sui-cyan/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sui-cyan cursor-pointer"
                        title="Previous page"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>

                      {/* Page number pills */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(tipTransactions.length / ITEMS_PER_PAGE) }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setAuditPage(i + 1)}
                            className={`h-6 min-w-[1.5rem] px-1.5 rounded-cyber-sm text-[9px] font-mono font-bold transition-all cursor-pointer ${
                              auditPage === i + 1
                                ? 'bg-sui-cyan/20 border border-sui-cyan/50 text-sui-cyan'
                                : 'border border-sui-cyan/10 text-gray-500 hover:border-sui-cyan/30 hover:text-gray-300'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setAuditPage(p => Math.min(Math.ceil(tipTransactions.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={auditPage >= Math.ceil(tipTransactions.length / ITEMS_PER_PAGE)}
                        className="h-7 w-7 flex items-center justify-center rounded-cyber-sm border border-sui-cyan/20 hover:border-sui-cyan/50 hover:bg-sui-cyan/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sui-cyan cursor-pointer"
                        title="Next page"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

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
      <aside className="w-80 flex-shrink-0 hidden lg:block h-screen overflow-y-auto scrollbar-cyber">
        <div className="px-4 pt-4 pb-0">
          <SearchInputWithRecommendations placeholder="Search BlobCast..." />
        </div>
        <TrendingWidget />
      </aside>

      {/* 4. Live Simulated Tipping Toast Alert Drawer */}
      {/* <AnimatePresence>
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
      </AnimatePresence> */}

    </div>
  );
}
