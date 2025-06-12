import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProductDetection, RelatedProduct } from '@/lib/twelvelabs';
import * as cartStorage from '@/lib/cartStorage';
import { CartItem } from '@/lib/cartStorage';

// Define the shape of the cart context
interface CartContextType {
  items: CartItem[];
  addItem: (product: ProductDetection | RelatedProduct) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, change: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  toggleCart: () => void;
}

// Create the context with default values
const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
  isCartOpen: false,
  toggleCart: () => {},
});

// Custom hook to use the cart context
export const useCart = () => useContext(CartContext);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load cart from localStorage on initial render
  useEffect(() => {
    const savedCart = cartStorage.loadCart();
    setItems(savedCart);
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      cartStorage.saveCart(items);
    }
  }, [items, isInitialized]);

  // Add an item to the cart
  const addItem = (product: ProductDetection | RelatedProduct) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      
      if (existingItem) {
        // Update quantity if product already exists in cart
        return prevItems.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        // Convert RelatedProduct to CartItem if necessary
        const newItem: CartItem = {
          ...product,
          // Ensure all required ProductDetection fields are present
          position: 'position' in product ? product.position : { x: 0, y: 0 },
          timeAppearance: 'timeAppearance' in product ? product.timeAppearance : [0, 0],
          confidence: 'confidence' in product ? product.confidence : 1,
          quantity: 1
        };
        
        return [...prevItems, newItem];
      }
    });
    
    // Open cart when adding items
    if (!isCartOpen) {
      setIsCartOpen(true);
    }
  };

  // Remove an item from the cart
  const removeItem = (productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  // Update the quantity of an item in the cart
  const updateQuantity = (productId: string, change: number) => {
    setItems(prevItems => {
      return prevItems.reduce((acc: CartItem[], item) => {
        if (item.id === productId) {
          const newQuantity = item.quantity + change;
          if (newQuantity <= 0) return acc; // Remove if quantity is 0 or negative
          return [...acc, { ...item, quantity: newQuantity }];
        }
        return [...acc, item];
      }, []);
    });
  };

  // Clear the entire cart
  const clearCart = () => {
    setItems([]);
  };

  // Toggle cart open/closed
  const toggleCart = () => {
    setIsCartOpen(prev => !prev);
  };

  // Calculate total items and price
  const totalItems = items.reduce((count, item) => count + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => {
    const price = item.price || 0;
    return total + (price * item.quantity);
  }, 0);

  // Context value
  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    isCartOpen,
    toggleCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
