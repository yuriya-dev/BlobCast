'use client';

import React from 'react';
import type { DropdownType, MentionUser, HashtagSuggestion, TickerSuggestion } from '@/hooks/useTextAutocomplete';
import { TrendingUp } from 'lucide-react';
import { useWalrusImage } from '@/hooks/useWalrusImage';

function MentionAutocompleteAvatar({ user }: { user: any }) {
  const avatarUrlResolved = useWalrusImage(user.avatarBlobId || null);
  const finalAvatar = avatarUrlResolved || (user.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}` : '');

  return (
    <div className="h-7 w-7 rounded-full overflow-hidden bg-walrus-blue flex items-center justify-center font-mono text-[10px] font-bold text-sui-cyan border border-sui-cyan/15 flex-shrink-0 relative">
      {finalAvatar ? (
        <img
          src={finalAvatar}
          alt={user.displayName || ''}
          className="h-full w-full object-cover z-10"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : null}
    </div>
  );
}

interface AutocompleteDropdownProps {
  show: boolean;
  dropdownType: DropdownType;
  selectedIndex: number;
  mentionSuggestions: MentionUser[];
  hashtagSuggestions: HashtagSuggestion[];
  tickerSuggestions: TickerSuggestion[];
  onSelectMention: (user: MentionUser) => void;
  onSelectHashtag: (tag: HashtagSuggestion) => void;
  onSelectTicker: (ticker: TickerSuggestion) => void;
  /** Extra CSS classes for positioning the dropdown */
  className?: string;
}

export function AutocompleteDropdown({
  show,
  dropdownType,
  selectedIndex,
  mentionSuggestions,
  hashtagSuggestions,
  tickerSuggestions,
  onSelectMention,
  onSelectHashtag,
  onSelectTicker,
  className = '',
}: AutocompleteDropdownProps) {
  if (!show) return null;

  const headerLabel =
    dropdownType === 'mention'
      ? '👤 Mention someone'
      : dropdownType === 'hashtag'
      ? '# Trending hashtags'
      : '$ Crypto tickers';

  const activeSuggestions =
    dropdownType === 'mention'
      ? mentionSuggestions
      : dropdownType === 'hashtag'
      ? hashtagSuggestions
      : tickerSuggestions;

  if (activeSuggestions.length === 0) return null;

  return (
    <div
      className={`absolute left-0 z-[100] w-72 bg-deep-space/98 border border-sui-cyan/25 rounded-cyber-lg shadow-cyber-glow overflow-hidden backdrop-blur-xl ${className}`}
      style={{ top: '100%', marginTop: '6px' }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-sui-cyan/10">
        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
          {headerLabel}
        </span>
      </div>

      {/* Mention items */}
      {dropdownType === 'mention' &&
        (mentionSuggestions as MentionUser[]).map((u, idx) => (
          <button
            key={u.id || u.username}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelectMention(u); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
              idx === selectedIndex
                ? 'bg-sui-cyan/15 border-l-2 border-sui-cyan'
                : 'hover:bg-walrus-blue/50 border-l-2 border-transparent'
            }`}
          >
            <MentionAutocompleteAvatar user={u} />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-sans font-semibold text-white leading-none truncate">
                {u.displayName || u.username}
              </span>
              <span className="text-[9px] font-mono text-sui-cyan/70 mt-0.5 truncate">
                @{u.username}
              </span>
            </div>
            {idx === selectedIndex && (
              <span className="ml-auto text-[8px] font-mono text-gray-500 flex-shrink-0">↵</span>
            )}
          </button>
        ))}

      {/* Hashtag items */}
      {dropdownType === 'hashtag' &&
        (hashtagSuggestions as HashtagSuggestion[]).map((h, idx) => (
          <button
            key={h.tag}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelectHashtag(h); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
              idx === selectedIndex
                ? 'bg-sui-cyan/15 border-l-2 border-sui-cyan'
                : 'hover:bg-walrus-blue/50 border-l-2 border-transparent'
            }`}
          >
            <div className="h-7 w-7 rounded-full bg-sui-cyan/10 border border-sui-cyan/20 flex items-center justify-center flex-shrink-0">
              <span className="font-mono font-bold text-sui-cyan text-sm">#</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-sans font-semibold text-white leading-none truncate">
                #{h.tag}
              </span>
              {h.postCount !== undefined && (
                <span className="text-[9px] font-mono text-gray-500 mt-0.5">
                  {h.postCount.toLocaleString()} posts
                </span>
              )}
            </div>
            {idx === selectedIndex && (
              <span className="ml-auto text-[8px] font-mono text-gray-500 flex-shrink-0">↵</span>
            )}
          </button>
        ))}

      {/* Ticker items */}
      {dropdownType === 'ticker' &&
        (tickerSuggestions as TickerSuggestion[]).map((t, idx) => (
          <button
            key={t.symbol}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelectTicker(t); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
              idx === selectedIndex
                ? 'bg-sui-cyan/15 border-l-2 border-sui-cyan'
                : 'hover:bg-walrus-blue/50 border-l-2 border-transparent'
            }`}
          >
            <div className="h-7 w-7 rounded-full bg-amber-400/10 border border-amber-400/25 flex items-center justify-center flex-shrink-0">
              <span className="font-mono font-bold text-amber-400 text-sm">$</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-sans font-semibold text-white leading-none truncate">
                ${t.symbol}
                <span className="ml-1 text-[9px] font-mono text-gray-500">{t.name}</span>
              </span>
              {t.change && (
                <span className={`text-[9px] font-mono mt-0.5 flex items-center gap-0.5 ${t.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <TrendingUp className="h-2.5 w-2.5" />
                  {t.change}
                </span>
              )}
            </div>
            {idx === selectedIndex && (
              <span className="ml-auto text-[8px] font-mono text-gray-500 flex-shrink-0">↵</span>
            )}
          </button>
        ))}
    </div>
  );
}
