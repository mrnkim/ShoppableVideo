"use client";

import React, { ReactNode } from 'react';
import { CartProvider } from '@/contexts/CartContext';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Application providers wrapper component
 *
 * This component wraps the application with all necessary context providers:
 * - CartProvider: Manages shopping cart state and persistence
 */
export default function Providers({ children }: ProvidersProps) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}
