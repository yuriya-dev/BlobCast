'use client';

import React from 'react';
import { TrendingUp, Flame, Database, Compass } from 'lucide-react';

export function TrendingWidget() {
  const trendingTags = [
    { name: 'blobcast', posts: '4,289 blobs cast', trend: '+142%' },
    { name: 'walrus', posts: '12,980 shards saved', trend: '+85%' },
    { name: 'suinetwork', posts: '8,401 epoch txs', trend: '+45%' },
    { name: 'tatum', posts: '1,980 gateway calls', trend: '+95%' },
  ];

  return (
    <div className="flex flex-col gap-6 p-4">
      
      {/* Trending panel */}
      <div className="glass-panel rounded-cyber-lg shadow-cyber-glow p-5 border border-sui-cyan/10">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-4.5 w-4.5 text-amber-400 fill-amber-400/10" />
          <h2 className="text-sm font-bold font-mono tracking-wider uppercase text-white">Trending Casts</h2>
        </div>

        <div className="flex flex-col gap-4">
          {trendingTags.map((tag, idx) => (
            <div key={tag.name} className="flex justify-between items-start group cursor-pointer">
              <div>
                <span className="text-xs font-mono text-sui-cyan group-hover:underline">#{tag.name}</span>
                <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{tag.posts}</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded-cyber-sm border border-emerald-400/10">
                {tag.trend}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Walrus details widget */}
      <div className="glass-panel rounded-cyber-lg shadow-cyber-glow p-5 border border-sui-cyan/10 bg-gradient-to-br from-walrus-blue/50 to-deep-space">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4.5 w-4.5 text-sui-cyan" />
          <h2 className="text-sm font-bold font-mono tracking-wider uppercase text-white">Walrus Storage Status</h2>
        </div>

        <div className="flex flex-col gap-3 font-mono text-[10px] text-gray-400">
          <div className="flex justify-between">
            <span>Storage Network:</span>
            <span className="text-sui-cyan">TESTNET</span>
          </div>
          <div className="flex justify-between">
            <span>Aggregators:</span>
            <span className="text-emerald-400">6 Online</span>
          </div>
          <div className="flex justify-between">
            <span>Active Epoch:</span>
            <span className="text-white">#22</span>
          </div>
          <div className="flex justify-between">
            <span>Replica Factors:</span>
            <span className="text-white">120 Shards Grid</span>
          </div>
          
          <div className="h-px bg-sui-cyan/10 my-1" />
          
          <p className="text-[9px] text-gray-500 italic leading-relaxed">
            All text posts, avatars, and media files are stored permanently across Walrus decentralized nodes.
          </p>
        </div>
      </div>

    </div>
  );
}
