'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  BadgeCheck, 
  User, 
  Flame, 
  Database,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { mockDb } from '@/lib/db';
import { useWalrusImage } from '@/hooks/useWalrusImage';

function CreatorRecommendationAvatar({ username, displayName, registeredUsers }: { username: string; displayName: string; registeredUsers: any[] }) {
  const source = registeredUsers.length > 0 ? registeredUsers : mockDb.users;
  const user = source.find(u => u.username === username);
  const avatarUrlResolved = useWalrusImage(user?.avatarBlobId || null);
  const finalAvatar = avatarUrlResolved || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  return (
    <div className="h-6 w-6 rounded-full overflow-hidden bg-walrus-blue flex items-center justify-center font-mono text-[10px] font-bold text-sui-cyan border border-sui-cyan/10 relative">
      {finalAvatar ? (
        <img 
          src={finalAvatar} 
          alt={displayName}
          className="h-full w-full object-cover z-10"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : null}
    </div>
  );
}

function CreatorAutocompleteAvatar({ creator }: { creator: any }) {
  const avatarUrlResolved = useWalrusImage(creator.avatarBlobId || null);
  const finalAvatar = avatarUrlResolved || (creator.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${creator.username}` : '');

  return (
    <div className="h-7 w-7 rounded-full overflow-hidden bg-walrus-blue flex items-center justify-center font-mono text-xs font-bold text-sui-cyan border border-sui-cyan/10 relative">
      {finalAvatar ? (
        <img 
          src={finalAvatar} 
          alt={creator.displayName || ''}
          className="h-full w-full object-cover z-10"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : null}
    </div>
  );
}

interface SearchInputWithRecommendationsProps {
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export function SearchInputWithRecommendations({ 
  placeholder = "Search casts, tags, or creators...", 
  className = "",
  initialValue = ""
}: SearchInputWithRecommendationsProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync initialValue prop
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Fetch registered users for autocomplete on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.fetchAllUsers();
        if (active && res && res.data && Array.isArray(res.data.users)) {
          setRegisteredUsers(res.data.users);
        }
      } catch (err) {
        console.warn("⚠️ Autocomplete: offline fallback to mockDb users.");
        if (active) {
          setRegisteredUsers(mockDb.users);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsFocused(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleRecommendationClick = (recValue: string) => {
    setQuery(recValue);
    setIsFocused(false);
    router.push(`/search?q=${encodeURIComponent(recValue)}`);
  };

  const truncateWallet = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Recommendations data
  const recommendedCreators = [
    { username: 'yuriya', displayName: 'Yuriya', walletAddress: '0x14b6a2164130de573dcdd114299ba144629979fe9423bc8e81bc06754e6b3e43' },
    { username: 'vitalik', displayName: 'Vitalik Buterin', walletAddress: '0x321a5cf4de7c89f01a34d284a1e948cde7231456107b22d148cd90ef718cda12' },
    { username: 'mystenlabs', displayName: 'Mysten Labs', walletAddress: '0x81b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7' }
  ];

  const recommendedTags = ['blobcast', 'suinetwork', 'walrus'];
  const recommendedTickers = ['SUI', 'SNEK', 'CETUS'];
  const recommendedCaptions = ['Decentralized social', 'Walrus protocol'];

  // Filter matching creators based on query
  const getMatchingCreators = () => {
    if (!query) return [];
    const cleanQuery = query.toLowerCase().replace('@', '');
    const source = registeredUsers.length > 0 ? registeredUsers : mockDb.users;
    return source.filter(u => 
      (u.username || '').toLowerCase().includes(cleanQuery) ||
      (u.displayName || '').toLowerCase().includes(cleanQuery)
    ).slice(0, 5);
  };

  const getMatchingTags = () => {
    if (!query.startsWith('#')) return [];
    const cleanQuery = query.toLowerCase().replace('#', '');
    return recommendedTags.filter(t => t.toLowerCase().includes(cleanQuery)).slice(0, 3);
  };

  const getMatchingTickers = () => {
    if (!query.startsWith('$')) return [];
    const cleanQuery = query.toLowerCase().replace('$', '');
    return recommendedTickers.filter(t => t.toLowerCase().includes(cleanQuery)).slice(0, 3);
  };

  const matchingCreators = getMatchingCreators();
  const matchingTags = getMatchingTags();
  const matchingTickers = getMatchingTickers();

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      
      {/* Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center bg-walrus-blue/40 border border-sui-cyan/15 rounded-2xl px-4 py-3 group focus-within:border-sui-cyan/40 focus-within:shadow-cyber-glow transition-all">
        <Search className="h-4 w-4 text-gray-500 group-focus-within:text-sui-cyan transition-colors shrink-0" />
        <input 
          type="text"
          value={query}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsFocused(true);
          }}
          placeholder={placeholder}
          className="bg-transparent border-none outline-none text-xs text-soft-white placeholder-gray-500 ml-3 w-full font-mono"
        />
        {query && (
          <button 
            type="button"
            onClick={() => {
              setQuery('');
              setIsFocused(true);
            }}
            className="text-gray-500 hover:text-white transition-colors p-0.5 rounded-full shrink-0"
            title="Clear Search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Recommendations & Autocomplete Dropdown */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-deep-space/95 border border-sui-cyan/20 rounded-cyber-lg shadow-cyber-glow p-4 backdrop-blur-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* CASE A: Input is empty - show categories of suggestions */}
          {!query && (
            <div className="flex flex-col gap-4">
              
              {/* Creators */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest pl-1">
                  👤 Suggested Creators
                </span>
                <div className="flex flex-col gap-1.5">
                  {recommendedCreators.map((creator) => (
                    <button
                      key={creator.username}
                      type="button"
                      onClick={() => handleRecommendationClick(`@${creator.username}`)}
                      className="flex items-center justify-between p-2 rounded-xl bg-walrus-blue/30 border border-sui-cyan/5 hover:border-sui-cyan/25 hover:bg-walrus-blue/60 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <CreatorRecommendationAvatar username={creator.username} displayName={creator.displayName} registeredUsers={registeredUsers} />
                        <div className="flex flex-col">
                          <span className="text-xs font-sans font-semibold text-white leading-tight">
                            {creator.displayName}
                          </span>
                          <span className="text-[9px] font-mono text-gray-500">
                            @{creator.username}
                          </span>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono text-gray-500 group-hover:text-sui-cyan transition-colors">
                        {truncateWallet(creator.walletAddress)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hashtags & Tickers Grid */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Hashtags */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest pl-1">
                    #️⃣ Hashtags
                  </span>
                  <div className="flex flex-col gap-1">
                    {recommendedTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleRecommendationClick(`#${tag}`)}
                        className="p-1.5 rounded-lg bg-walrus-blue/20 hover:bg-walrus-blue/40 border border-sui-cyan/5 hover:border-sui-cyan/15 text-left text-xs font-mono text-sui-cyan flex items-center justify-between group transition-all"
                      >
                        <span>#{tag}</span>
                        <ArrowRight className="h-3 w-3 text-gray-600 opacity-0 group-hover:opacity-100 group-hover:text-sui-cyan transition-all" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tickers */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest pl-1">
                    💵 Tickers
                  </span>
                  <div className="flex flex-col gap-1">
                    {recommendedTickers.map((ticker) => (
                      <button
                        key={ticker}
                        type="button"
                        onClick={() => handleRecommendationClick(`$${ticker}`)}
                        className="p-1.5 rounded-lg bg-walrus-blue/20 hover:bg-walrus-blue/40 border border-sui-cyan/5 hover:border-sui-cyan/15 text-left text-xs font-mono text-amber-400 flex items-center justify-between group transition-all"
                      >
                        <span>${ticker}</span>
                        <TrendingUp className="h-3 w-3 text-gray-600 opacity-0 group-hover:opacity-100 group-hover:text-amber-400 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Captions */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest pl-1">
                  📝 Sample Keywords
                </span>
                <div className="flex flex-wrap gap-2">
                  {recommendedCaptions.map((caption) => (
                    <button
                      key={caption}
                      type="button"
                      onClick={() => handleRecommendationClick(caption)}
                      className="px-3 py-1.5 rounded-xl bg-walrus-blue/20 border border-sui-cyan/5 hover:border-sui-cyan/20 text-xs font-sans text-gray-300 hover:text-white transition-all"
                    >
                      &ldquo;{caption}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* CASE B: Input has text - show dynamic live autocomplete */}
          {query && (
            <div className="flex flex-col gap-3">
              
              {/* Creator results */}
              {matchingCreators.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest pl-1">
                    👤 Creators Found ({matchingCreators.length})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {matchingCreators.map((creator) => (
                      <Link
                        key={creator.id}
                        href={creator.username
                          ? `/profile?username=${encodeURIComponent(creator.username)}`
                          : `/profile?wallet=${creator.walletAddress}`}
                        onClick={() => setIsFocused(false)}
                        className="flex items-center justify-between p-2 rounded-xl bg-walrus-blue/30 border border-sui-cyan/5 hover:border-sui-cyan/25 hover:bg-walrus-blue/60 transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <CreatorAutocompleteAvatar creator={creator} />
                          <div className="flex flex-col">
                            <span className="text-xs font-sans font-semibold text-white leading-none">
                              {creator.displayName}
                            </span>
                            <span className="text-[9px] font-mono text-gray-500 mt-0.5">
                              @{creator.username}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono text-gray-600 bg-sui-cyan/5 border border-sui-cyan/10 px-1.5 py-0.5 rounded">
                            {truncateWallet(creator.walletAddress)}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-gray-600 group-hover:text-sui-cyan transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tag results if query starts with # */}
              {query.startsWith('#') && matchingTags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest pl-1">
                    #️⃣ Matching Tags
                  </span>
                  <div className="flex flex-col gap-1">
                    {matchingTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleRecommendationClick(`#${tag}`)}
                        className="p-2 rounded-xl bg-walrus-blue/20 hover:bg-walrus-blue/40 border border-sui-cyan/5 text-left text-xs font-mono text-sui-cyan flex items-center justify-between"
                      >
                        <span>#{tag}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ticker results if query starts with $ */}
              {query.startsWith('$') && matchingTickers.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest pl-1">
                    💵 Matching Tickers
                  </span>
                  <div className="flex flex-col gap-1">
                    {matchingTickers.map((ticker) => (
                      <button
                        key={ticker}
                        type="button"
                        onClick={() => handleRecommendationClick(`$${ticker}`)}
                        className="p-2 rounded-xl bg-walrus-blue/20 hover:bg-walrus-blue/40 border border-sui-cyan/5 text-left text-xs font-mono text-amber-400 flex items-center justify-between"
                      >
                        <span>${ticker}</span>
                        <TrendingUp className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Global Search Option */}
              <button
                type="button"
                onClick={() => {
                  setIsFocused(false);
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }}
                className="w-full py-2.5 rounded-cyber-sm bg-gradient-to-r from-sui-cyan to-tatum-purple hover:opacity-90 active:scale-[0.98] transition-all text-deep-space font-bold font-mono text-[10px] uppercase flex items-center justify-center gap-1.5 mt-1"
              >
                <Search className="h-3.5 w-3.5" />
                Search casts for &ldquo;{query}&rdquo;
              </button>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
