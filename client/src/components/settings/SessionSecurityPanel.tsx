'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Zap, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { api } from '@/lib/api';

type SessionSecurityPanelProps = {
  walletAddress?: string | null;
  showSponsorInfo?: boolean;
};

export function SessionSecurityPanel({
  walletAddress,
  showSponsorInfo = true,
}: SessionSecurityPanelProps) {
  const {
    isSessionActive,
    isAuthorizingSession,
    authorizeSessionKey,
    revokeSessionKey,
  } = useAuth();

  const [sponsorInfo, setSponsorInfo] = useState<{ address: string; balance: string } | null>(null);

  const fetchSponsorInfo = useCallback(async () => {
    if (!showSponsorInfo) return;
    try {
      const res = await api.fetchSponsorAddress();
      if (res?.data) {
        setSponsorInfo({
          address: res.data.address,
          balance: res.data.balance,
        });
      }
    } catch (err) {
      console.warn('⚠️ Failed fetching sponsor info from backend:', err);
    }
  }, [showSponsorInfo]);

  useEffect(() => {
    fetchSponsorInfo();
  }, [fetchSponsorInfo]);

  return (
    <div className="glass-panel rounded-cyber-xl p-5 border border-sui-cyan/15 bg-gradient-to-r from-walrus-blue/15 to-tatum-purple/5 relative overflow-hidden flex flex-col gap-4 shadow-cyber-glow">
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-tatum-purple/5 rounded-full blur-xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-sui-cyan/5 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-sui-cyan animate-pulse" />
          <h3 className="font-mono font-bold text-xs uppercase text-white tracking-wider">
            Session Keys & Zero-Friction Security
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span className={`h-2 w-2 rounded-full ${isSessionActive ? 'bg-emerald-400 node-pulse' : 'bg-amber-400'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSessionActive ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isSessionActive ? 'Active Authorized' : 'No Active Session'}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1 text-xs text-gray-400 leading-relaxed font-sans">
          <p>
            BlobCast utilizes client-side secure session authorization to eliminate repetitive wallet popups. When active, you can post and interact instantly. Tipping always requires direct wallet confirmation.
          </p>
          {isSessionActive && (
            <p className="text-[10px] font-mono text-sui-cyan mt-1.5 uppercase tracking-wider">
              Session active for this wallet. Authorized for zero-friction social actions.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0 font-mono">
          {isSessionActive ? (
            <button
              type="button"
              onClick={revokeSessionKey}
              className="w-full sm:w-auto px-4 py-2 rounded-cyber-md bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 hover:border-rose-500 hover:text-white text-rose-300 font-bold text-[11px] uppercase tracking-wider transition-all duration-300 cursor-pointer whitespace-nowrap"
            >
              Revoke Session
            </button>
          ) : (
            <button
              type="button"
              onClick={() => authorizeSessionKey(walletAddress || undefined)}
              disabled={isAuthorizingSession || !walletAddress}
              className="w-full sm:w-auto px-4 py-2 rounded-cyber-md bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space font-extrabold text-[11px] uppercase tracking-wider hover:opacity-95 hover:shadow-cyber-glow active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {isAuthorizingSession ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Authorizing...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 fill-deep-space" />
                  Authorize Session
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showSponsorInfo && sponsorInfo && (
        <div className="mt-2 border-t border-sui-cyan/5 pt-4 flex flex-col gap-2 bg-deep-space/30 border border-sui-cyan/5 rounded-xl p-3 font-mono text-[10px] select-text">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-linear-to-r from-sui-cyan to-tatum-purple animate-pulse" />
              <span className="text-gray-400 uppercase">Sponsor Gas Station Wallet:</span>
              <span className="text-white select-all break-all">{sponsorInfo.address}</span>
            </div>
            <a
              href={`https://suiscan.xyz/testnet/account/${sponsorInfo.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-sui-cyan hover:underline hover:text-white transition-colors"
            >
              SuiScan <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-sui-cyan/5 pt-2 mt-1">
            <span className="text-gray-400 uppercase">Gas Station Fuel Balance:</span>
            <span className={`font-bold ${Number(sponsorInfo.balance) > 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {sponsorInfo.balance} SUI
            </span>
          </div>
          <p className="text-[9px] text-gray-500 font-sans leading-relaxed mt-1">
            If the Gas Station Fuel Balance runs low, sponsored transactions may fall back to local offline indexer mode.
          </p>
        </div>
      )}
    </div>
  );
}
