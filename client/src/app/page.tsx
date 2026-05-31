'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Database, ShieldCheck, Sparkles, Terminal, Wallet } from 'lucide-react';
import { ConnectButton } from '@mysten/dapp-kit';

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <div className="flex-1 flex flex-col justify-between relative overflow-hidden min-h-screen walrus-orb-bg">
      <div className="absolute top-0 right-0 w-140 h-140 rounded-full bg-tatum-purple/5 blur-3xl z-0 pointer-events-none rotating-orb" />
      <div className="absolute bottom-0 left-0 w-130 h-130 rounded-full bg-sui-cyan/5 blur-3xl z-0 pointer-events-none rotating-orb" style={{ animationDirection: 'reverse' }} />

      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-xl p-0.5 group-hover:rotate-6 transition-all duration-300">
            <img src="/logo.svg" alt="BlobCast" width={32} height={32} />
          </div>
          <div>
            <p className="font-mono font-black text-sm tracking-[0.3em] text-white text-neon-glow">BLOBCAST</p>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em]">Decentralized social layer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-[1px] rounded-2xl bg-gradient-to-r from-sui-cyan to-tatum-purple">
            <Link
              href="/login"
              className="px-8 py-4 rounded-2xl bg-walrus-blue/60 text-sui-cyan font-semibold font-mono text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(111,231,255,0.25)] group"
            >
              Login
            </Link>
          </div>
          <ConnectButton connectText="Connect Wallet" className="rounded-xl! bg-linear-to-r! from-sui-cyan! to-tatum-purple! text-deep-space! font-mono! text-xs! font-bold! py-2! px-4! shadow-md!" />
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:py-24 text-center max-w-6xl mx-auto z-10 relative w-full">
        {/* Hero Section: two-column layout on md+ */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 w-full">

          {/* LEFT: text content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center md:items-start gap-6 flex-1 text-center md:text-left"
          >
            <motion.div variants={itemVariants} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest bg-sui-cyan/10 text-sui-cyan border border-sui-cyan/20 uppercase">
              <Sparkles className="h-3 w-3" /> Wallet-based onboarding
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold font-mono tracking-tight text-white leading-[1.08]">
              Own your posts <br />
              <span className="walrus-text-gradient font-bold italic">forever.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="max-w-xl text-gray-400 text-sm md:text-base font-sans leading-relaxed">
              BlobCast is a decentralized social protocol powered by Walrus storage, the Sui blockchain, and Tatum RPC infrastructure. Use your wallet to sign in, create a profile, and publish content without passwords.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mt-4 w-full justify-center md:justify-start px-4 md:px-0">
              <Link href="/login" className="px-8 py-4 rounded-2xl bg-linear-to-r from-sui-cyan to-tatum-purple text-deep-space font-semibold font-mono text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(111,231,255,0.25)] group">
                Login <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/register" className="px-8 py-4 rounded-2xl bg-walrus-blue/60 backdrop-blur-md text-white border border-sui-cyan/20 hover:border-sui-cyan/50 font-semibold font-mono text-sm flex items-center justify-center gap-2 hover:bg-walrus-blue/80 active:scale-[0.98] transition-all">
                Register <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>

          {/* RIGHT: walrus mascot image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex-shrink-0 hidden md:flex items-center justify-center"
          >
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sui-cyan/20 to-tatum-purple/20 blur-2xl scale-110 pointer-events-none" />
            {/* Rotating dashed border */}
            <div
              className="absolute inset-[-8px] rounded-full border border-dashed border-sui-cyan/20 pointer-events-none rotating-orb"
              style={{ animationDuration: '20s' }}
            />
            {/* Static ring */}
            <div className="absolute inset-[-2px] rounded-full border border-sui-cyan/10 pointer-events-none" />

            {/* Image container */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative z-10 w-56 h-56 lg:w-72 lg:h-72 rounded-full border border-sui-cyan/20 shadow-[0_0_60px_rgba(111,231,255,0.15)]"
            >
              <img
                src="/walrus.svg"
                alt="Walrus mascot"
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Floating badge below image */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest bg-walrus-blue/80 backdrop-blur-md text-sui-cyan border border-sui-cyan/20 whitespace-nowrap shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-sui-cyan node-pulse" />
              Powered by Walrus
            </div>
          </motion.div>

        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-6xl mt-20 text-left">
          <div className="glass-panel rounded-3xl p-6 border border-sui-cyan/5">
            <Database className="h-6 w-6 text-sui-cyan mb-4" />
            <h3 className="font-mono font-bold text-sm text-white mb-2 uppercase">Permanent storage</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">Posts and media remain available through Walrus storage.</p>
          </div>

          <div className="glass-panel rounded-3xl p-6 border border-sui-cyan/5">
            <Wallet className="h-6 w-6 text-sui-cyan mb-4" />
            <h3 className="font-mono font-bold text-sm text-white mb-2 uppercase">Wallet identity</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">Connect with a Sui wallet and manage identity without passwords.</p>
          </div>

          <div className="glass-panel rounded-3xl p-6 border border-sui-cyan/5">
            <Cpu className="h-6 w-6 text-tatum-purple mb-4" />
            <h3 className="font-mono font-bold text-sm text-white mb-2 uppercase">Tatum RPC</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">Low-latency blockchain access backed by Tatum infrastructure.</p>
          </div>

          <div className="glass-panel rounded-3xl p-6 border border-sui-cyan/5">
            <ShieldCheck className="h-6 w-6 text-emerald-400 mb-4" />
            <h3 className="font-mono font-bold text-sm text-white mb-2 uppercase">Verifiable trust</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">Every action maps to a cryptographically verifiable social record.</p>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-sui-cyan/5 py-8 mt-12 bg-deep-space relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[10px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 node-pulse" />
            <span>Sui network connected | Powered by Tatum RPC</span>
          </div>
          <span>&copy; {new Date().getFullYear()} BlobCast. Own your posts forever.</span>
        </div>
      </footer>
    </div>
  );
}