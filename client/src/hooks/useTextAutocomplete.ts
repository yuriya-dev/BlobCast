'use client';

import { useState, useRef, useCallback, useMemo } from 'react';

export type DropdownType = 'mention' | 'hashtag' | 'ticker' | null;

export interface MentionUser {
  id?: string;
  username: string;
  displayName?: string;
  walletAddress?: string;
  avatarBlobId?: string;
}

export interface HashtagSuggestion {
  tag: string;        // without #
  postCount?: number;
}

export interface TickerSuggestion {
  symbol: string;     // without $
  name: string;
  change?: string;    // e.g. "+4.2%"
  positive?: boolean;
}

// Static list of popular crypto tickers
export const POPULAR_TICKERS: TickerSuggestion[] = [
  { symbol: 'SUI', name: 'Sui Network', change: '+4.2%', positive: true },
  { symbol: 'ETH', name: 'Ethereum', change: '+1.8%', positive: true },
  { symbol: 'BTC', name: 'Bitcoin', change: '-0.5%', positive: false },
  { symbol: 'SOL', name: 'Solana', change: '+6.1%', positive: true },
  { symbol: 'WALRUS', name: 'Walrus Protocol', change: '+12.4%', positive: true },
  { symbol: 'USDC', name: 'USD Coin', change: '0.0%', positive: true },
  { symbol: 'APT', name: 'Aptos', change: '+2.3%', positive: true },
  { symbol: 'SEI', name: 'Sei Network', change: '-1.2%', positive: false },
  { symbol: 'INJ', name: 'Injective', change: '+3.7%', positive: true },
  { symbol: 'TIA', name: 'Celestia', change: '-2.1%', positive: false },
];

// Default trending hashtags (injected from posts in the hook)
export const DEFAULT_TRENDING_TAGS: HashtagSuggestion[] = [
  { tag: 'web3', postCount: 142 },
  { tag: 'sui', postCount: 98 },
  { tag: 'walrus', postCount: 87 },
  { tag: 'defi', postCount: 74 },
  { tag: 'nft', postCount: 63 },
  { tag: 'crypto', postCount: 58 },
  { tag: 'blobcast', postCount: 45 },
  { tag: 'blockchain', postCount: 41 },
  { tag: 'dao', postCount: 32 },
  { tag: 'move', postCount: 28 },
];

export interface UseTextAutocompleteOptions {
  users: MentionUser[];
  trendingTags?: HashtagSuggestion[];
  maxSuggestions?: number;
}

export function useTextAutocomplete({
  users,
  trendingTags = DEFAULT_TRENDING_TAGS,
  maxSuggestions = 5,
}: UseTextAutocompleteOptions) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [text, setText] = useState('');
  const [dropdownType, setDropdownType] = useState<DropdownType>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filtered suggestions based on dropdown type + query
  const mentionSuggestions = useMemo<MentionUser[]>(() => {
    if (dropdownType !== 'mention') return [];
    if (!query) return users.slice(0, maxSuggestions);
    const q = query.toLowerCase();
    return users.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.displayName || '').toLowerCase().includes(q)
    ).slice(0, maxSuggestions);
  }, [dropdownType, query, users, maxSuggestions]);

  const hashtagSuggestions = useMemo<HashtagSuggestion[]>(() => {
    if (dropdownType !== 'hashtag') return [];
    if (!query) return trendingTags.slice(0, maxSuggestions);
    const q = query.toLowerCase();
    return trendingTags.filter(h => h.tag.toLowerCase().startsWith(q)).slice(0, maxSuggestions);
  }, [dropdownType, query, trendingTags, maxSuggestions]);

  const tickerSuggestions = useMemo<TickerSuggestion[]>(() => {
    if (dropdownType !== 'ticker') return [];
    if (!query) return POPULAR_TICKERS.slice(0, maxSuggestions);
    const q = query.toUpperCase();
    return POPULAR_TICKERS.filter(t =>
      t.symbol.startsWith(q) || t.name.toUpperCase().includes(q)
    ).slice(0, maxSuggestions);
  }, [dropdownType, query, maxSuggestions]);

  const totalSuggestions =
    mentionSuggestions.length + hashtagSuggestions.length + tickerSuggestions.length;

  const showDropdown = dropdownType !== null && totalSuggestions > 0;

  // Parse text to detect which autocomplete trigger is active at the cursor
  const detectTrigger = useCallback((val: string, cursorPos: number) => {
    const textBeforeCursor = val.substring(0, cursorPos);
    const lastSpace = Math.max(
      textBeforeCursor.lastIndexOf(' '),
      textBeforeCursor.lastIndexOf('\n'),
      -1
    );
    const word = textBeforeCursor.substring(lastSpace + 1);

    // Check @mention
    if (word.startsWith('@')) {
      const afterTrigger = word.substring(1);
      if (!/\s/.test(afterTrigger)) {
        setDropdownType('mention');
        setQuery(afterTrigger);
        setSelectedIndex(0);
        return;
      }
    }

    // Check #hashtag
    if (word.startsWith('#')) {
      const afterTrigger = word.substring(1);
      if (!/\s/.test(afterTrigger)) {
        setDropdownType('hashtag');
        setQuery(afterTrigger);
        setSelectedIndex(0);
        return;
      }
    }

    // Check $ticker
    if (word.startsWith('$')) {
      const afterTrigger = word.substring(1);
      if (!/\s/.test(afterTrigger)) {
        setDropdownType('ticker');
        setQuery(afterTrigger);
        setSelectedIndex(0);
        return;
      }
    }

    setDropdownType(null);
    setQuery('');
  }, []);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const val = e.target.value;
      setText(val);
      const cursorPos = e.target.selectionStart ?? val.length;
      detectTrigger(val, cursorPos);
    },
    [detectTrigger]
  );

  /** Insert a suggestion into the text at the current cursor, replacing the trigger word */
  const insertSuggestion = useCallback(
    (insertText: string) => {
      if (!textareaRef.current) return;
      const val = text;
      const cursorPos = textareaRef.current.selectionStart ?? val.length;
      const textBeforeCursor = val.substring(0, cursorPos);
      const textAfterCursor = val.substring(cursorPos);

      const lastSpace = Math.max(
        textBeforeCursor.lastIndexOf(' '),
        textBeforeCursor.lastIndexOf('\n'),
        -1
      );
      const beforeTrigger = val.substring(0, lastSpace + 1);
      const newText = beforeTrigger + insertText + ' ' + textAfterCursor;

      setText(newText);
      setDropdownType(null);
      setQuery('');

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = beforeTrigger.length + insertText.length + 1;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [text]
  );

  const insertMention = useCallback(
    (user: MentionUser) => insertSuggestion(`@${user.username}`),
    [insertSuggestion]
  );

  const insertHashtag = useCallback(
    (tag: HashtagSuggestion) => insertSuggestion(`#${tag.tag}`),
    [insertSuggestion]
  );

  const insertTicker = useCallback(
    (ticker: TickerSuggestion) => insertSuggestion(`$${ticker.symbol}`),
    [insertSuggestion]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (!showDropdown) return;

      const activeSuggestions =
        dropdownType === 'mention'
          ? mentionSuggestions
          : dropdownType === 'hashtag'
          ? hashtagSuggestions
          : tickerSuggestions;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % activeSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + activeSuggestions.length) % activeSuggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (dropdownType === 'mention') insertMention(mentionSuggestions[selectedIndex]);
        else if (dropdownType === 'hashtag') insertHashtag(hashtagSuggestions[selectedIndex]);
        else if (dropdownType === 'ticker') insertTicker(tickerSuggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setDropdownType(null);
      }
    },
    [showDropdown, dropdownType, mentionSuggestions, hashtagSuggestions, tickerSuggestions, selectedIndex, insertMention, insertHashtag, insertTicker]
  );

  const closeDropdown = useCallback(() => {
    setDropdownType(null);
    setQuery('');
  }, []);

  return {
    text,
    setText,
    textareaRef,
    containerRef,
    dropdownType,
    query,
    selectedIndex,
    showDropdown,
    mentionSuggestions,
    hashtagSuggestions,
    tickerSuggestions,
    handleTextChange,
    handleKeyDown,
    insertMention,
    insertHashtag,
    insertTicker,
    closeDropdown,
  };
}
