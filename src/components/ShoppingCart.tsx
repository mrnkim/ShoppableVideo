import React, { useState, useEffect } from 'react';
import { ShoppingBag, Close, Add, Remove } from '@mui/icons-material';
import { ProductDetection } from '@/lib/twelvelabs';

export interface CartItem extends ProductDetection {
  quantity: number;
}

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, change: number) => void;
  onCheckout: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({
  items,
  onUpdateQuantity,
  onCheckout,
  isOpen = false,
  onToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isOpen);
  const [cartTotal, setCartTotal] = useState<number>(0);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  // Update local state when props change
  useEffect(() => {
    setIsExpanded(isOpen);
  }, [isOpen]);

  // Calculate cart total whenever items change
  useEffect(() => {
    const total = items.reduce((sum, item) => {
      return sum + ((item.price || 0) * item.quantity);
    }, 0);
    setCartTotal(total);
  }, [items]);

  // Handle cart toggle
  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (onToggle) {
      onToggle();
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    setIsCheckingOut(true);
    // Simulate checkout process
    setTimeout(() => {
      onCheckout();
      setIsCheckingOut(false);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Cart Header */}
      <div 
        className="bg-secondary text-white p-4 flex justify-between items-center cursor-pointer"
        onClick={handleToggle}
      >
        <div className="flex items-center space-x-2">
          <ShoppingBag />
          <h2 className="font-semibold">Your Cart ({items.length})</h2>
        </div>
        <span className="font-semibold">${cartTotal.toFixed(2)}</span>
      </div>
      
      {/* Cart Content */}
      {isExpanded && (
        <div className="p-4">
          {items.length === 0 ? (
            <div className="text-center py-6">
              <ShoppingBag className="mx-auto text-gray-300" style={{ fontSize: '3rem' }} />
              <p className="text-gray-500 mt-2">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-1">
                Click on product markers in the video to discover items
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto product-sidebar">
                {items.map(item => (
                  <div key={item.id} className="flex items-center py-3 border-b border-gray-100 last:border-0">
                    <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
                      {/* Product thumbnail would go here */}
                      <ShoppingBag className="text-gray-400" fontSize="small" />
                    </div>
                    <div className="ml-3 flex-grow">
                      <h3 className="text-sm font-medium">{item.name}</h3>
                      <p className="text-xs text-gray-500">${(item.price || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button 
                        className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        aria-label="Decrease quantity"
                      >
                        <Remove fontSize="small" />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button 
                        className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        aria-label="Increase quantity"
                      >
                        <Add fontSize="small" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-sm text-gray-600">Shipping:</span>
                  <span className="text-sm">Free</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="font-medium">Total:</span>
                  <span className="font-semibold">${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  className={`w-full py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 ${
                    isCheckingOut 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-accent hover:bg-blue-600 text-white'
                  }`}
                  onClick={handleCheckout}
                  disabled={isCheckingOut || items.length === 0}
                >
                  {isCheckingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Checkout'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Mini Cart (when collapsed) */}
      {!isExpanded && items.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between">
          <div className="flex -space-x-2">
            {items.slice(0, 3).map((item, index) => (
              <div 
                key={item.id} 
                className="w-6 h-6 rounded-full bg-gray-200 border border-white flex items-center justify-center text-xs"
                style={{ zIndex: 10 - index }}
              >
                {item.name.charAt(0)}
              </div>
            ))}
            {items.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-300 border border-white flex items-center justify-center text-xs" style={{ zIndex: 7 }}>
                +{items.length - 3}
              </div>
            )}
          </div>
          <button 
            className="text-xs bg-accent text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
            onClick={handleToggle}
          >
            View Cart
          </button>
        </div>
      )}
    </div>
  );
};

export default ShoppingCart;
