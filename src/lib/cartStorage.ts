import { ProductDetection } from './twelvelabs';

// Define cart item type (product with quantity)
export interface CartItem extends ProductDetection {
  quantity: number;
}

// Storage key for localStorage
const CART_STORAGE_KEY = 'shoppable_video_cart';

/**
 * Save cart items to localStorage
 * 
 * @param items - Cart items to save
 */
export const saveCart = (items: CartItem[]): void => {
  // Only run in browser environment
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
};

/**
 * Load cart items from localStorage
 * 
 * @returns Array of cart items or empty array if none found
 */
export const loadCart = (): CartItem[] => {
  // Only run in browser environment
  if (typeof window === 'undefined') return [];
  
  try {
    const cartData = localStorage.getItem(CART_STORAGE_KEY);
    if (!cartData) return [];
    
    return JSON.parse(cartData) as CartItem[];
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    return [];
  }
};

/**
 * Add a product to the cart
 * 
 * @param product - Product to add
 * @param quantity - Quantity to add (default: 1)
 * @returns Updated cart items
 */
export const addToCart = (product: ProductDetection, quantity: number = 1): CartItem[] => {
  const currentCart = loadCart();
  const existingItemIndex = currentCart.findIndex(item => item.id === product.id);
  
  if (existingItemIndex >= 0) {
    // Update quantity if product already exists in cart
    currentCart[existingItemIndex].quantity += quantity;
  } else {
    // Add new product to cart
    currentCart.push({
      ...product,
      quantity
    });
  }
  
  saveCart(currentCart);
  return currentCart;
};

/**
 * Update the quantity of a product in the cart
 * 
 * @param productId - ID of the product to update
 * @param quantityChange - Amount to change quantity by (can be negative)
 * @returns Updated cart items
 */
export const updateQuantity = (productId: string, quantityChange: number): CartItem[] => {
  const currentCart = loadCart();
  const updatedCart = currentCart.reduce((acc: CartItem[], item) => {
    if (item.id === productId) {
      const newQuantity = item.quantity + quantityChange;
      if (newQuantity <= 0) return acc; // Remove if quantity is 0 or negative
      return [...acc, { ...item, quantity: newQuantity }];
    }
    return [...acc, item];
  }, []);
  
  saveCart(updatedCart);
  return updatedCart;
};

/**
 * Remove a product from the cart
 * 
 * @param productId - ID of the product to remove
 * @returns Updated cart items
 */
export const removeFromCart = (productId: string): CartItem[] => {
  const currentCart = loadCart();
  const updatedCart = currentCart.filter(item => item.id !== productId);
  
  saveCart(updatedCart);
  return updatedCart;
};

/**
 * Clear the entire cart
 * 
 * @returns Empty array
 */
export const clearCart = (): CartItem[] => {
  saveCart([]);
  return [];
};

/**
 * Calculate the total value of the cart
 * 
 * @param items - Cart items to calculate total for
 * @returns Total cart value
 */
export const calculateCartTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => {
    const price = item.price || 0;
    return total + (price * item.quantity);
  }, 0);
};

/**
 * Get the total number of items in the cart
 * 
 * @param items - Cart items to count
 * @returns Total number of items
 */
export const getCartItemCount = (items: CartItem[]): number => {
  return items.reduce((count, item) => count + item.quantity, 0);
};
