'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Flame, 
  Users, 
  BadgeCheck, 
  Sparkles, 
  ExternalLink,
  Compass,
  ArrowRight,
  TrendingUp,
  Database
} from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { SearchInputWithRecommendations } from '@/components/feed/SearchInputWithRecommendations';
import { motion } from 'framer-motion';

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'trending' | 'creators' | 'ecosystem'>('trending');

  const trendingTags = [
    { name: 'blobcast', posts: '4,289 blobs cast', trend: '+142%', category: 'Social' },
    { name: 'walrus', posts: '12,980 shards saved', trend: '+85%', category: 'Storage' },
    { name: 'suinetwork', posts: '8,401 epoch txs', trend: '+45%', category: 'Protocol' },
    { name: 'tatum', posts: '1,980 gateway calls', trend: '+95%', category: 'RPC' },
    { name: 'decentSocial', posts: '3,104 profiles', trend: '+120%', category: 'Web3' },
    { name: 'erasureCoding', posts: '2,900 reconstructions', trend: '+110%', category: 'Math' },
  ];

  const creatorsList = [
    {
      id: 'c1',
      displayName: 'Vitalik Buterin',
      username: 'vitalik',
      walletAddress: '0x321a5cf4de7c89f01a34d284a1e948cde7231456107b22d148cd90ef718cda12',
      followers: '4.8M',
      bio: 'Fascinated by decentralized cryptography, social scaling layers, and permanent information archives.',
      avatarInitials: 'VB'
    },
    {
      id: 'c2',
      displayName: 'Yuriya',
      username: 'yuriya',
      walletAddress: '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
      followers: '1,248',
      bio: 'BlobCast core architect. Writing social schemas directly onto the Walrus storage layers.',
      avatarInitials: 'YU'
    },
    {
      id: 'c3',
      displayName: 'Mysten Labs',
      username: 'mystenlabs',
      walletAddress: '0x81b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7',
      followers: '320K',
      bio: 'Official builders of the Sui blockchain. Scaling transaction execution and web3 performance.',
      avatarInitials: 'ML'
    }
  ];

  const filteredTags = trendingTags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto h-screen overflow-hidden">
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 hidden md:block h-screen">
        <Sidebar />
      </aside>

      {/* 2. Middle Content Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col h-screen overflow-y-auto scrollbar-cyber">
        
        {/* Header Toolbar */}
        <header className="glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-6 py-5 sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-sui-cyan animate-pulse" />
            <h2 className="font-mono font-bold text-sm tracking-wider uppercase text-white">Explore Dashboard</h2>
          </div>
          
          <span className="text-[10px] font-mono text-gray-500 bg-sui-cyan/5 px-2.5 py-0.5 rounded-full border border-sui-cyan/10">
            INDEXER EPOCH #22
          </span>
        </header>

        {/* Explore Visual Banner */}
        <div className="walrus-mesh-bg h-40 w-full relative border-b border-sui-cyan/10 flex items-end p-6">
          <div className="absolute inset-0 bg-gradient-to-t from-deep-space via-transparent to-transparent z-0" />
          <div className="relative z-10">
            <span className="text-[9px] font-mono font-bold tracking-widest text-sui-cyan uppercase bg-sui-cyan/10 px-2 py-0.5 border border-sui-cyan/20">
              Featured Spotlights
            </span>
            <h1 className="text-2xl font-bold font-mono text-white mt-1.5 uppercase">
              Permanent Social Graph
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Decentralized metadata stored dynamically across Walrus nodes
            </p>
          </div>
        </div>

        {/* Main Explore Content */}
        <div className="flex-1 p-6 flex flex-col gap-6">
          
          {/* Cyber Search Bar */}
          <SearchInputWithRecommendations 
            placeholder="Search trending tags, creators, schemas, or node IDs..."
          />

          {/* Navigation Category Tabs */}
          <div className="flex border-b border-sui-cyan/5 font-mono text-xs mt-2">
            <button 
              onClick={() => setActiveCategory('trending')}
              className={`px-4 py-3 border-b-2 transition-all font-bold ${activeCategory === 'trending' ? 'border-sui-cyan text-sui-cyan' : 'border-transparent text-gray-500 hover:text-white'}`}
            >
              TRENDING TAGS
            </button>
            <button 
              onClick={() => setActiveCategory('creators')}
              className={`px-4 py-3 border-b-2 transition-all font-bold ${activeCategory === 'creators' ? 'border-sui-cyan text-sui-cyan' : 'border-transparent text-gray-500 hover:text-white'}`}
            >
              SPOTLIGHT CREATORS
            </button>
          </div>

          {/* Dynamic Content Grid based on active category */}
          {activeCategory === 'trending' ? (
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">
                ⚡ Active Hashtag Shard distribution
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredTags.map((tag) => (
                  <div 
                    key={tag.name}
                    className="glass-panel glass-panel-hover rounded-cyber-lg p-5 border border-sui-cyan/5 transition-all duration-300 relative group flex justify-between items-center"
                  >
                    <div>
                      <span className="text-[9px] uppercase font-mono text-gray-500 tracking-wider block">
                        {tag.category}
                      </span>
                      <span className="text-sm font-mono text-sui-cyan font-bold block mt-1">
                        #{tag.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                        {tag.posts}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-400/5 px-2.5 py-0.5 rounded-full border border-emerald-400/20 font-bold">
                        {tag.trend}
                      </span>
                      <Link 
                        href={`/search?q=${encodeURIComponent('#' + tag.name)}`}
                        className="text-[10px] font-mono text-gray-500 hover:text-sui-cyan flex items-center gap-1 mt-2 justify-end transition-colors"
                      >
                        Explore Feed <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">
                👤 Verified Cryptographic Creators on-chain
              </span>

              <div className="flex flex-col gap-4">
                {creatorsList.map((creator) => (
                  <div 
                    key={creator.id}
                    className="glass-panel rounded-cyber-lg p-5 border border-sui-cyan/5 relative group flex flex-col sm:flex-row gap-4 justify-between items-start"
                  >
                    <div className="flex gap-3">
                      <div className="h-11 w-11 rounded-cyber-md bg-gradient-to-tr from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0">
                        <div className="h-full w-full rounded-cyber-md bg-walrus-blue flex items-center justify-center font-mono font-bold text-sm text-sui-cyan">
                          {creator.avatarInitials}
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-white font-sans hover:underline cursor-pointer">
                            {creator.displayName}
                          </h4>
                          <BadgeCheck className="h-4 w-4 text-sui-cyan fill-sui-cyan/10" />
                        </div>
                        <span className="text-xs font-mono text-gray-500">@{creator.username}</span>
                        <p className="text-xs text-gray-300 leading-relaxed font-sans mt-2 max-w-lg">
                          {creator.bio}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <span className="text-[10px] font-mono text-gray-500">
                        {creator.followers} Followers
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
