"use client";

import React, { ReactNode } from 'react';
import { CartProvider } from '@/contexts/CartContext';
import { TwelveLabsProvider } from '@/contexts/TwelveLabsContext';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Application providers wrapper component
 * 
 * This component wraps the application with all necessary context providers:
 * - CartProvider: Manages shopping cart state and persistence
 * - TwelveLabsProvider: Manages TwelveLabs API client and operations
 */
export default function Providers({ children }: ProvidersProps) {
  // Get TwelveLabs API key from environment variables
  const twelveLabsApiKey = process.env.NEXT_PUBLIC_TWELVELABS_API_KEY;
  const twelveLabsApiUrl = process.env.NEXT_PUBLIC_TWELVELABS_API_URL;

  return (
    <TwelveLabsProvider apiKey={twelveLabsApiKey} apiBaseUrl={twelveLabsApiUrl}>
      <CartProvider>
        {children}
      </CartProvider>
    </TwelveLabsProvider>
  );
}
