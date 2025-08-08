import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';


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
      <body className="min-h-screen bg-zinc-100">
        <header>

          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="mt-auto">
            <div className="container mx-auto px-4 py-6">
              <div className="text-center text-xs">
                <p>© {new Date().getFullYear()} ShoppableVideo Demo - Powered by TwelveLabs AI</p>
              </div>
            </div>
          </footer>
      </body>
    </html>
  );
}
