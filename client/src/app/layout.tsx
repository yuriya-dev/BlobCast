import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import { SuiProvider } from '@/components/providers/SuiProvider';
import { AuthGate, AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BlobCast — Own your posts forever',
  description: 'A decentralized social protocol powered by Walrus decentralized storage, Sui blockchain, and Tatum enterprise RPC infrastructure.',
  icons: {
    icon: '/favicon.ico',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-deep-space text-soft-white selection:bg-sui-cyan/20 selection:text-sui-cyan">
        
        {/* Dynamic Space Background elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {/* Cybernetic grid */}
          <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{
              backgroundImage: 'linear-gradient(rgba(111, 231, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(111, 231, 255, 0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          
          {/* Walrus Floating Ocean Blobs */}
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-sui-cyan rounded-full floating-blob" style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-tatum-purple rounded-full floating-blob" style={{ animationDelay: '-8s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-[350px] h-[350px] bg-blue-600 rounded-full floating-blob" style={{ animationDelay: '-16s' }} />
        </div>

        {/* Global Web3 Provider Context */}
        <SuiProvider>
          <AuthProvider>
            <AuthGate>
              <div className="relative z-10 flex-1 flex flex-col min-h-full">
                {children}
              </div>
            </AuthGate>
          </AuthProvider>
        </SuiProvider>
        
      </body>
    </html>
  );
}
