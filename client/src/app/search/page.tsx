'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  MoreHorizontal, 
  TrendingUp, 
  TrendingDown, 
  Database,
  Eye,
  BadgeCheck,
  UserPlus,
  Compass,
  ArrowRight,
  Flame
} from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { PostCard } from '@/components/feed/PostCard';
import { api } from '@/lib/api';
import { mockDb } from '@/lib/db';
import { walrus } from '@/lib/walrus';

// Predefined asset data for tickers
interface AssetData {
  name: string;
  symbol: string;
  meta: string;
  marketCap: string;
  basePrice: number;
  change: string;
  isPositive: boolean;
  avatarBg: string;
  avatarText: string;
  chartData: Record<string, number[]>;
}

const assetsMap: Record<string, AssetData> = {
  'SUI': {
    name: 'Sui',
    symbol: 'SUI',
    meta: 'SUI • Crypto • Layer 1',
    marketCap: '$3.7B MC',
    basePrice: 1.48,
    change: '+12.4%',
    isPositive: true,
    avatarBg: 'from-sui-cyan to-walrus-blue',
    avatarText: 'SUI',
    chartData: {
      '1D': [1.32, 1.35, 1.34, 1.38, 1.42, 1.45, 1.48],
      '1W': [1.25, 1.28, 1.35, 1.32, 1.40, 1.44, 1.48],
      '1M': [1.10, 1.15, 1.22, 1.18, 1.30, 1.42, 1.48],
      '1Y': [0.45, 0.65, 0.90, 0.82, 1.15, 1.35, 1.48],
      'ALL': [0.35, 0.55, 0.85, 1.20, 1.65, 1.32, 1.48],
    }
  },
  'SNEK': {
    name: 'Snek',
    symbol: 'SNEK',
    meta: 'SUI • Meme • Community Coin',
    marketCap: '$12.8M MC',
    basePrice: 0.000142,
    change: '+45.2%',
    isPositive: true,
    avatarBg: 'from-emerald-500 to-teal-700',
    avatarText: '🐍',
    chartData: {
      '1D': [0.000098, 0.000110, 0.000105, 0.000125, 0.000130, 0.000135, 0.000142],
      '1W': [0.000085, 0.000092, 0.000115, 0.000102, 0.000120, 0.000138, 0.000142],
      '1M': [0.000050, 0.000072, 0.000095, 0.000082, 0.000110, 0.000132, 0.000142],
      '1Y': [0.000012, 0.000025, 0.000045, 0.000035, 0.000080, 0.000120, 0.000142],
      'ALL': [0.000008, 0.000015, 0.000035, 0.000075, 0.000115, 0.000095, 0.000142],
    }
  },
  'CETUS': {
    name: 'Cetus Protocol',
    symbol: 'CETUS',
    meta: 'SUI • DeFi • DEX Aggregator',
    marketCap: '$85.4M MC',
    basePrice: 0.185,
    change: '-4.8%',
    isPositive: false,
    avatarBg: 'from-indigo-600 to-purple-800',
    avatarText: '🐳',
    chartData: {
      '1D': [0.198, 0.194, 0.195, 0.191, 0.188, 0.186, 0.185],
      '1W': [0.175, 0.182, 0.189, 0.184, 0.192, 0.190, 0.185],
      '1M': [0.160, 0.165, 0.172, 0.168, 0.180, 0.192, 0.185],
      '1Y': [0.085, 0.115, 0.140, 0.132, 0.165, 0.178, 0.185],
      'ALL': [0.055, 0.085, 0.125, 0.150, 0.210, 0.195, 0.185],
    }
  }
};

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(rawQuery);
  const [activeTab, setActiveTab] = useState<'top' | 'latest' | 'people' | 'media'>('top');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y' | 'ALL'>('1D');
  const [posts, setPosts] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Re-sync query state when query parameters change
  useEffect(() => {
    setSearchQuery(rawQuery);
    setIsLoading(true);
    loadSearchPosts();
  }, [rawQuery]);

  const loadSearchPosts = async () => {
    setIsLoading(true);
    try {
      const response = await api.fetchPosts(1, 100);
      if (response && response.data && response.data.posts) {
        const apiPosts = response.data.posts;
        const mapped = await Promise.all(apiPosts.map(async (p: any) => {
          let text = 'Immutable social post stored on Walrus.';
          let hashtags: string[] = [];
          let mediaUrl: string | undefined = undefined;

          if (p.walrusBlobId) {
            try {
              const walrusContent = await walrus.getBlob(p.walrusBlobId);
              if (walrusContent && typeof walrusContent === 'object') {
                const contentObj = walrusContent as any;
                if (contentObj.content?.text) text = contentObj.content.text;
                if (contentObj.content?.hashtags) hashtags = contentObj.content.hashtags;
                if (contentObj.media && contentObj.media.length > 0) mediaUrl = contentObj.media[0].blob_id;
              }
            } catch (err) {
              if (p.id === 'post-1') {
                text = 'Welcome to BlobCast! Own your social posts forever. Text and media are packaged in a single JSON schema and stored permanently on Walrus. Verify it on-chain!';
                hashtags = ['blobcast', 'sui'];
              } else if (p.id === 'post-2') {
                text = 'Excited about decentralized social layers! Decentralization means true resilience. Check this out: even if our centralized server is powered down, this content remains accessible directly from the Walrus storage aggregator grid!';
                hashtags = ['decentralized', 'walrus'];
                mediaUrl = 'walrus://blob-post-2-image';
              }
            }
          }

          return {
            id: p.id,
            author: {
              displayName: p.author?.displayName || 'Anonymous Caster',
              username: p.author?.username || 'anonymous',
              walletAddress: p.author?.walletAddress || '0x000000...',
              avatarBlobId: p.author?.avatarBlobId || '',
              verified: p.author?.verified || false
            },
            walrusBlobId: p.walrusBlobId,
            blobHash: p.blobHash,
            contentType: p.contentType,
            text,
            hashtags,
            mediaUrl: mediaUrl || (p.media && p.media.length > 0 ? p.media[0].walrusBlobId : undefined) || (p.contentType === 1 ? 'walrus://blob-post-2-image' : undefined),
            likeCount: p.likeCount,
            commentCount: p.commentCount,
            repostCount: p.repostCount,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            likes: p.likes || [],
            reposts: p.reposts || []
          };
        }));
        setPosts(mapped);
      }

      try {
        const usersResponse = await api.fetchAllUsers();
        if (usersResponse && usersResponse.data && usersResponse.data.users) {
          setRegisteredUsers(usersResponse.data.users);
        }
      } catch (usersErr) {
        console.warn("⚠️ Failed to fetch registered users for search:", usersErr);
        setRegisteredUsers([]);
      }
    } catch (err) {
      console.warn("⚠️ API offline. Using mock db for search.");
      // Fallback
      const mapped = mockDb.posts.map(p => {
        const authorUser = mockDb.users.find(u => u.id === p.authorId) || mockDb.users[0];
        let text = 'Immutable social post stored on Walrus.';
        if (p.walrusContent) {
          text = (p.walrusContent as any).content?.text || text;
        }
        return {
          id: p.id,
          author: {
            displayName: authorUser.displayName || 'Anonymous Caster',
            username: authorUser.username || 'anonymous',
            walletAddress: authorUser.walletAddress,
            avatarBlobId: authorUser.avatarBlobId || '',
            verified: authorUser.verified,
          },
          walrusBlobId: p.walrusBlobId,
          blobHash: p.blobHash,
          contentType: p.contentType,
          text,
          hashtags: (p.walrusContent as any)?.content?.hashtags || [],
          mediaUrl: p.walrusContent?.media?.[0]?.blob_id || (p.contentType === 1 ? 'walrus://blob-post-2-image' : undefined),
          media: p.walrusContent?.media || (p.contentType === 1 ? [{ type: 'image', blob_id: 'walrus://blob-post-2-image' }] : []),
          walrusContent: p.walrusContent,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          repostCount: p.repostCount,
          createdAt: p.createdAt,
          likes: [],
          reposts: []
        };
      });
      setPosts(mapped);
      setRegisteredUsers(mockDb.users);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Determine if searching for a ticker
  const isTickerSearch = rawQuery.startsWith('$');
  const cleanTicker = isTickerSearch ? rawQuery.replace('$', '').toUpperCase() : '';

  // Get active asset details or mock custom one
  const activeAsset: AssetData = assetsMap[cleanTicker] || {
    name: cleanTicker,
    symbol: cleanTicker,
    meta: `SUI • Crypto • Dynamic Asset`,
    marketCap: '$2.5M MC',
    basePrice: 0.42,
    change: '+5.7%',
    isPositive: true,
    avatarBg: 'from-amber-500 to-amber-700',
    avatarText: '💎',
    chartData: {
      '1D': [0.38, 0.40, 0.39, 0.41, 0.43, 0.41, 0.42],
      '1W': [0.32, 0.35, 0.38, 0.37, 0.40, 0.44, 0.42],
      '1M': [0.25, 0.28, 0.32, 0.30, 0.36, 0.40, 0.42],
      '1Y': [0.08, 0.12, 0.18, 0.22, 0.30, 0.38, 0.42],
      'ALL': [0.05, 0.10, 0.15, 0.25, 0.38, 0.32, 0.42],
    }
  };

  // Dynamic price calculation based on timeframe filter
  const timeframeValues = activeAsset.chartData[timeframe] || [0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42];
  const currentPrice = timeframeValues[timeframeValues.length - 1] || activeAsset.basePrice;
  const initialPrice = timeframeValues[0] || activeAsset.basePrice;
  const rawPctChange = ((currentPrice - initialPrice) / initialPrice) * 100;
  const computedPctChange = rawPctChange.toFixed(1);
  const isPricePositive = rawPctChange >= 0;

  // Filter posts based on active tab
  const getFilteredPosts = () => {
    const q = rawQuery.toLowerCase();
    
    // Filter matching criteria
    const matches = posts.filter(p => {
      if (!q) return true;
      return (
        p.text.toLowerCase().includes(q) ||
        p.author.displayName.toLowerCase().includes(q) ||
        p.author.username.toLowerCase().includes(q) ||
        p.hashtags.some((tag: string) => tag.toLowerCase().includes(q))
      );
    });

    if (activeTab === 'top') {
      // Sort by highest engagement
      return [...matches].sort((a, b) => (b.likeCount + b.repostCount) - (a.likeCount + a.repostCount));
    }
    if (activeTab === 'latest') {
      return [...matches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (activeTab === 'media') {
      return matches.filter(p => p.mediaUrl);
    }
    return matches;
  };

  // Filter people/creators for the "People" tab
  const getFilteredPeople = () => {
    const q = rawQuery.toLowerCase();
    const sourceList = registeredUsers.length > 0 ? registeredUsers : mockDb.users;
    if (!q) return sourceList;
    return sourceList.filter(u => 
      (u.displayName || '').toLowerCase().includes(q) || 
      (u.username || '').toLowerCase().includes(q) ||
      (u.bio || '').toLowerCase().includes(q)
    );
  };

  const displayedPosts = getFilteredPosts();
  const displayedPeople = getFilteredPeople();

  // Create an SVG dynamic path for the chart based on timeframeValues
  const generateChartPath = (width: number, height: number) => {
    if (timeframeValues.length === 0) return '';
    const minVal = Math.min(...timeframeValues);
    const maxVal = Math.max(...timeframeValues);
    const range = maxVal - minVal || 1;

    const points = timeframeValues.map((val, idx) => {
      const x = (idx / (timeframeValues.length - 1)) * width;
      // Invert Y axis for SVG (0,0 is top-left)
      const y = height - ((val - minVal) / range) * (height - 20) - 10;
      return `${x},${y}`;
    });

    return {
      linePath: `M ${points.join(' L ')}`,
      areaPath: `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`
    };
  };

  const chartWidth = 500;
  const chartHeight = 180;
  const chartPaths = generateChartPath(chartWidth, chartHeight);

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto h-screen overflow-hidden">
      
      {/* 1. Left Sidebar Navigation Column */}
      <aside className="w-64 flex-shrink-0 hidden md:block h-screen">
        <Sidebar />
      </aside>

      {/* 2. Middle Search Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col h-screen overflow-y-auto scrollbar-cyber">
        
        {/* User-Defined 1. App Bar (Bagian Paling Atas) */}
        <header className="glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-6 py-4 sticky top-0 z-40 flex items-center justify-between gap-4 flex-shrink-0">
          {/* Kiri: Ikon Kembali */}
          <button 
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-walrus-blue/40 border border-sui-cyan/15 text-gray-400 hover:text-sui-cyan hover:border-sui-cyan/30 transition-all flex-shrink-0 cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>

          {/* Tengah: Kolom pencarian pill-shaped capsules */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center bg-walrus-blue/40 border border-sui-cyan/15 rounded-full px-5 py-2.5 group focus-within:border-sui-cyan/40 focus-within:shadow-cyber-glow transition-all">
            <Search className="h-4 w-4 text-gray-500 group-focus-within:text-sui-cyan transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search casts, tags or tickers..."
              className="bg-transparent border-none outline-none text-xs text-soft-white placeholder-gray-500 ml-3 w-full font-mono"
            />
          </form>

          {/* Kanan: Ikon Menu Tiga Titik */}
          <button 
            className="p-2.5 rounded-xl bg-walrus-blue/40 border border-sui-cyan/15 text-gray-400 hover:text-white hover:border-sui-cyan/30 transition-all flex-shrink-0 cursor-pointer"
            title="More Options"
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>
        </header>

        {/* User-Defined 2. Tab Menu Navigasi */}
        <nav className="flex border-b border-sui-cyan/5 px-6 font-mono text-xs z-30 sticky top-[73px] bg-deep-space/95 backdrop-blur-xl flex-shrink-0">
          <div className="flex w-full justify-between sm:justify-start gap-2">
            {(['top', 'latest', 'people', 'media'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-4 border-b-2 transition-all font-bold uppercase tracking-wider ${
                  activeTab === tab 
                    ? 'border-sui-cyan text-sui-cyan' 
                    : 'border-transparent text-gray-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>

        {/* Dynamic Ticker/Asset Section (Only rendered if search query starts with '$') */}
        {isTickerSearch && (
          <div className="mx-6 mt-6 p-6 glass-panel rounded-cyber-xl border border-sui-cyan/10 relative overflow-hidden flex flex-col gap-5 shadow-cyber-glow flex-shrink-0">
            
            {/* Cyberpunk ambient chart glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-sui-cyan/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* User-Defined 3. Header Informasi Aset */}
              <div className="flex items-center gap-3.5">
                {/* Kiri: Ikon avatar/logo lingkaran */}
                <div className={`h-11 w-11 rounded-full bg-gradient-to-tr ${activeAsset.avatarBg} p-0.5 flex-shrink-0 flex items-center justify-center font-mono font-bold text-xs text-white shadow-md`}>
                  <div className="h-full w-full rounded-full bg-walrus-blue/80 flex items-center justify-center font-black">
                    {activeAsset.avatarText}
                  </div>
                </div>
                {/* Tengah: Teks kolom Judul dan Sub-informasi */}
                <div className="flex flex-col">
                  <h3 className="font-bold text-base text-white leading-none font-mono tracking-wide">
                    {activeAsset.name}
                  </h3>
                  <span className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-wider">
                    {activeAsset.meta} • {activeAsset.marketCap}
                  </span>
                </div>
              </div>

              {/* User-Defined 4. Ringkasan Harga */}
              <div className="flex flex-col sm:items-end">
                {/* Atas: Teks tebal & sangat besar */}
                <span className="text-2xl font-black text-white font-mono leading-none tracking-tight">
                  ${currentPrice >= 0.01 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
                </span>
                {/* Bawah: Perubahan persentase & ikon panah kecil */}
                <span className={`text-[10px] font-mono font-bold mt-1 flex items-center gap-0.5 ${
                  isPricePositive ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isPricePositive ? (
                    <TrendingUp className="h-3 w-3 animate-bounce" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {isPricePositive ? '+' : ''}{computedPctChange}% ({timeframe})
                  </span>
                </span>
              </div>

            </div>

            {/* User-Defined 5. Area Grafik (Chart) */}
            <div className="h-44 w-full relative bg-walrus-blue/30 rounded-cyber-lg border border-sui-cyan/5 overflow-hidden p-2 flex items-center justify-center">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-full overflow-visible z-10"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#00F2FE" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Garis referensi putus-putus (dashed line) di bagian tengah */}
                <line 
                  x1="0" 
                  y1={chartHeight / 2} 
                  x2={chartWidth} 
                  y2={chartHeight / 2} 
                  stroke="rgba(111, 231, 255, 0.2)" 
                  strokeDasharray="4 4" 
                  strokeWidth="1.5"
                />

                {/* Area under line */}
                {chartPaths && (
                  <path 
                    d={chartPaths.areaPath} 
                    fill="url(#chart-area-grad)" 
                  />
                )}

                {/* Main chart line */}
                {chartPaths && (
                  <path 
                    d={chartPaths.linePath} 
                    fill="none" 
                    stroke="#00F2FE" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    className="drop-shadow-[0_2px_8px_rgba(111,231,255,0.4)]"
                  />
                )}
              </svg>

              <span className="absolute top-2.5 right-3 text-[8px] font-mono text-gray-600 uppercase tracking-widest pointer-events-none">
                Live Shard telemetry indexer
              </span>
            </div>

            {/* User-Defined 6. Filter Rentang Waktu (Bottom Bar) */}
            <div className="flex border-t border-sui-cyan/5 pt-3 justify-between items-center z-10">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider hidden sm:block">
                Select Range
              </span>
              
              <div className="flex gap-2">
                {(['1D', '1W', '1M', '1Y', 'ALL'] as const).map(opt => {
                  const isActive = timeframe === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setTimeframe(opt)}
                      className={`px-3.5 py-1.5 rounded-full font-mono text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space shadow-cyber-glow'
                          : 'bg-walrus-blue/40 border border-sui-cyan/10 text-gray-500 hover:text-white hover:border-sui-cyan/30'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* Match Feed Content Area */}
        <div className="p-6 flex flex-col gap-6 flex-1">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-t-transparent border-sui-cyan animate-spin" />
                <span className="text-xs font-mono text-gray-500">Searching Walrus blobs...</span>
              </div>
            </div>
          ) : activeTab === 'people' ? (
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block pl-1">
                👤 Matched Identity Records ({displayedPeople.length})
              </span>

              {displayedPeople.length === 0 ? (
                <div className="bg-walrus-blue/20 border border-sui-cyan/10 rounded-cyber-lg p-10 text-center font-mono text-xs text-gray-500">
                  No matching creators found for &quot;{rawQuery}&quot;.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {displayedPeople.map((creator) => (
                    <div 
                      key={creator.id}
                      className="glass-panel rounded-cyber-lg p-5 border border-sui-cyan/5 relative group flex flex-col sm:flex-row gap-4 justify-between items-start"
                    >
                      <div className="flex gap-3">
                        <Link 
                          href={`/profile?wallet=${creator.walletAddress}`} 
                          className="h-11 w-11 rounded-cyber-md bg-gradient-to-tr from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0 overflow-hidden hover:scale-105 transition-transform duration-200"
                        >
                          <div className="h-full w-full rounded-cyber-md bg-walrus-blue flex items-center justify-center font-mono font-bold text-sm text-sui-cyan relative">
                            {creator.username ? (
                              <img 
                                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${creator.username}`} 
                                alt={creator.displayName || ''}
                                className="h-full w-full object-cover z-10"
                              />
                            ) : null}
                            <span className="absolute inset-0 flex items-center justify-center bg-walrus-blue z-0">
                              {(creator.displayName || creator.username || 'YU').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </Link>

                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link href={`/profile?wallet=${creator.walletAddress}`}>
                              <h4 className="font-bold text-sm text-white font-sans hover:underline cursor-pointer">
                                {creator.displayName}
                              </h4>
                            </Link>
                            {creator.verified && (
                              <BadgeCheck className="h-4 w-4 text-sui-cyan fill-sui-cyan/10" />
                            )}
                          </div>
                          <span className="text-xs font-mono text-gray-500">@{creator.username}</span>
                          <p className="text-xs text-gray-300 leading-relaxed font-sans mt-2 max-w-lg">
                            {creator.bio}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 flex-shrink-0">
                        <span className="text-[10px] font-mono text-gray-500">
                          {creator.followersCount !== undefined ? `${creator.followersCount} Followers` : (creator.id?.startsWith('usr-') ? '1,248' : '0') + ' Followers'}
                        </span>
                        <Link 
                          href={`/profile?wallet=${creator.walletAddress}`}
                          className="px-4 py-1.5 rounded-cyber-sm bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space font-semibold font-mono text-[10px] uppercase flex items-center gap-1 hover:opacity-90 active:scale-[0.98] transition-all w-full sm:w-auto justify-center"
                        >
                          View Profile <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pl-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">
                  ⚡ Matched Blob Casts ({displayedPosts.length})
                </span>
                {rawQuery && (
                  <span className="text-[10px] font-mono text-sui-cyan bg-sui-cyan/10 px-2.5 py-0.5 rounded-full border border-sui-cyan/20">
                    &quot;{rawQuery}&quot;
                  </span>
                )}
              </div>

              {displayedPosts.length === 0 ? (
                <div className="bg-walrus-blue/20 border border-sui-cyan/10 rounded-cyber-lg p-10 text-center font-mono text-xs text-gray-500">
                  No matching casts found for &quot;{rawQuery}&quot;.
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {displayedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {/* 3. Right Sidebar Columns */}
      <aside className="w-80 flex-shrink-0 hidden lg:block h-screen overflow-y-auto scrollbar-cyber">
        <TrendingWidget />
      </aside>

    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-deep-space flex items-center justify-center font-mono text-xs text-sui-cyan">
        Loading Search Module...
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
