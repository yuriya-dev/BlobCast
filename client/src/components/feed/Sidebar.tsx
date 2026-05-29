'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Terminal, 
  Compass, 
  Bell, 
  User, 
  Zap, 
  MessageSquareShare,
  Bookmark,
  Wallet,
  MessageCircle
} from 'lucide-react';
import { ConnectButton } from '@mysten/dapp-kit';
import { PostComposer } from './PostComposer';
import { createPortal } from 'react-dom';

export function Sidebar() {
  const pathname = usePathname();
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/feed', icon: Home },
    { name: 'Explore', href: '/explore', icon: Compass },
    { name: 'Messages', href: '/messages', icon: MessageCircle, badge: 3 },
    { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Wallet', href: '/wallet', icon: Wallet },
    // { name: 'Diagnostics', href: '/dev', icon: Terminal },
  ];

  return (
    <div className={`flex flex-col gap-6 h-full p-4 border-r border-sui-cyan/5 ${isComposeOpen ? 'relative z-[9999]' : ''}`}>
      
      {/* Dynamic Cyber Logo */}
      <Link href="/" className="flex items-center gap-2 px-3 py-1 group mb-4">
        <div className="h-9 w-9 rounded-cyber-md bg-gradient-to-tr from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0 group-hover:rotate-6 transition-all duration-300">
          <div className="h-full w-full rounded-cyber-md bg-walrus-blue flex items-center justify-center font-bold text-sui-cyan">
            BC
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-mono font-black text-sm tracking-widest text-white text-neon-glow leading-none">
            BLOBCAST
          </span>
          <span className="text-[9px] font-mono text-gray-500 mt-0.5 uppercase tracking-wider leading-none">
            Permanent Social
          </span>
        </div>
      </Link>
      
      {/* Navigation items */}
      <nav className="flex-1 flex flex-col gap-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-cyber-md text-sm font-mono tracking-wide transition-all ${
                isActive 
                  ? 'bg-sui-cyan/15 text-sui-cyan border border-sui-cyan/15' 
                  : 'text-gray-400 hover:text-white hover:bg-walrus-blue/40'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.name}</span>
              {'badge' in item && item.badge && item.badge > 0 && (
                <span className="h-4.5 min-w-[1.125rem] px-1 bg-sui-cyan rounded-full text-[9px] font-bold text-deep-space flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom wallet connections */}
      <div className="mt-auto border-t border-sui-cyan/5 pt-6 flex flex-col gap-3">
        
        {/* Tatum RPC status tracker indicator */}
        <div className="flex items-center gap-2 bg-walrus-blue/50 border border-sui-cyan/10 rounded-cyber-md p-3 text-xs font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-400 node-pulse" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-gray-500">Tatum RPC</span>
            <span className="text-gray-300 font-semibold mt-0.5">Sui Gateway Active</span>
          </div>
        </div>

        {/* Sui Wallet DappKit Connect Button */}
        <div className="custom-wallet-connect-wrapper">
          <ConnectButton 
            connectText="Connect Wallet"
            className="w-full !rounded-cyber-md !bg-gradient-to-r !from-sui-cyan !to-tatum-purple !text-deep-space !font-mono !text-xs !font-bold !py-3 !px-4 !shadow-md !hover:opacity-90 !transition-all !cursor-pointer"
          />
        </div>

        {/* Glowing Neon Compose Button */}
        <button 
          onClick={() => setIsComposeOpen(true)}
          className="w-full py-3 px-4 rounded-cyber-md border border-sui-cyan/20 hover:border-sui-cyan/50 bg-sui-cyan/10 text-sui-cyan font-mono text-xs font-bold tracking-wide hover:bg-sui-cyan/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-cyber-glow"
        >
          <MessageSquareShare className="h-4 w-4" />
          <span>New Cast</span>
        </button>

      </div>

      {/* Compose Modal Overlay */}
      {isComposeOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-deep-space/80 backdrop-filter backdrop-blur-md p-4">
          <div className="glass-panel bg-walrus-blue rounded-cyber-lg shadow-cyber-glow max-w-lg w-full max-h-[90vh] overflow-y-auto border border-sui-cyan/25 relative flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsComposeOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white font-mono text-xs hover:underline cursor-pointer"
            >
              [Close]
            </button>
            <div className="mb-4">
              <h3 className="font-mono font-bold text-sm tracking-wider text-sui-cyan uppercase flex items-center gap-1.5">
                <MessageSquareShare className="h-4.5 w-4.5" /> Compose Verified Cast
              </h3>
              <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase">
                Content will package verifiably into a Walrus JSON payload
              </p>
            </div>
            <PostComposer onPostCreated={(newPost) => {
              setIsComposeOpen(false);
              // Optionally reload the feed if on the feed page
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }} />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
