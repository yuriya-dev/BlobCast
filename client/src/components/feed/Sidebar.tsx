'use client';

import React from 'react';
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
  Bookmark
} from 'lucide-react';
import { ConnectButton } from '@mysten/dapp-kit';

export function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Home Feed', href: '/feed', icon: Home },
    { name: 'Explore Search', href: '/explore', icon: Compass },
    { name: 'Bookmarks Archive', href: '/bookmarks', icon: Bookmark },
    { name: 'Cyber Profile', href: '/profile', icon: User },
    { name: 'Diagnostics', href: '/dev', icon: Terminal },
  ];

  return (
    <div className="flex flex-col gap-6 h-full p-4 border-r border-sui-cyan/5">
      
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
              <span>{item.name}</span>
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

      </div>

    </div>
  );
}
