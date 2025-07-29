import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './providers';

// Load Inter font with Latin subset for better performance
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Shoppable Video Platform',
  description: 'Discover and purchase products directly from videos without interrupting playback',
  keywords: 'shoppable video, video commerce, AI product detection, TwelveLabs',
  authors: [{ name: 'Shoppable Video Demo' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <Providers>
          <header className="border-b border-gray-200 bg-white">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                  <span className="text-white font-bold">SV</span>
                </div>
                <h1 className="text-xl font-semibold text-secondary">ShoppableVideo</h1>
              </div>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t border-gray-200 bg-white mt-auto">
            <div className="container mx-auto px-4 py-6">
              <div className="text-center text-sm text-gray-500">
                <p>© {new Date().getFullYear()} ShoppableVideo Demo - Powered by TwelveLabs AI</p>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
