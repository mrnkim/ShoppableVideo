import React from 'react';
import { Close, Info, ShoppingBag, LocalMall, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
interface Product {
  timeline: [number, number];
  brand: string;
  product_name: string;
  location: number[];
  price: string;
  description: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface ProductDetailSidebarProps {
  products: Product[];
  collapsedProducts: Record<string, boolean>;
  onToggleCollapse: (productName: string, brand: string) => void;
  relatedProducts: RelatedProduct[];
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onRelatedProductSelect: (product: RelatedProduct) => void;
  isLoading?: boolean;
}

const ProductDetailSidebar: React.FC<ProductDetailSidebarProps> = React.memo(({
  products,
  collapsedProducts,
  onToggleCollapse,
  relatedProducts,
  onClose,
  onAddToCart,
  onRelatedProductSelect,
  isLoading = false,
}) => {
  if (!products.length && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6 text-center h-full">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LocalMall className="text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Discover Products</h2>
        <p className="text-gray-600">
          Click on product markers in the video to view details.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6 h-full">
        <div className="animate-pulse">
          <div className="flex justify-between items-start mb-4">
            <div className="h-7 bg-gray-200 rounded w-3/4"></div>
            <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
          </div>

          <div className="bg-gray-200 h-48 rounded mb-4"></div>

          <div className="mb-4 space-y-2">
            <div className="flex justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="flex justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>

          <div className="h-20 bg-gray-200 rounded mb-4"></div>

          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <div className="h-4 bg-blue-100 rounded w-3/4 mb-2"></div>
            <div className="h-12 bg-blue-100 rounded"></div>
          </div>

          <div className="h-10 bg-gray-200 rounded mb-6"></div>

          <div className="mt-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-200 h-32 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-6 overflow-y-auto max-h-[calc(100vh-200px)] product-sidebar">
      {products.map((product, index) => {
        const uniqueKey = `${product.brand}-${product.product_name}`;
        const isCollapsed = collapsedProducts[uniqueKey];
        // Use simple index-based key for stability
        const reactKey = `product-${index}`;
        return (
          <div key={reactKey} className="mb-6">
            {isCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                  {Math.floor(product.timeline[0] / 60)}:{(Math.floor(product.timeline[0]) % 60).toString().padStart(2, '0')} - {Math.floor(product.timeline[1] / 60)}:{(Math.floor(product.timeline[1]) % 60).toString().padStart(2, '0')}
                </div>
                <span className="text-xl font-semibold truncate flex-1">{product.product_name}</span>
                <button
                  className="ml-2 flex-shrink-0"
                  onClick={() => onToggleCollapse(product.product_name, product.brand)}
                  aria-label="펼치기"
                >
                  <KeyboardArrowDown />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                      {Math.floor(product.timeline[0] / 60)}:{(Math.floor(product.timeline[0]) % 60).toString().padStart(2, '0')} - {Math.floor(product.timeline[1] / 60)}:{(Math.floor(product.timeline[1]) % 60).toString().padStart(2, '0')}
                    </div>
                    <h2 className="text-xl font-semibold truncate">{product.product_name}</h2>
                  </div>
                  <button
                    className="ml-2 flex-shrink-0"
                    onClick={() => onToggleCollapse(product.product_name, product.brand)}
                    aria-label="접기"
                  >
                    <KeyboardArrowUp />
                  </button>
                </div>
                <div className="mb-4">
                  <div className="mb-2">
                    <span className="text-gray-600">Price: </span>
                    <span className="font-semibold">{product.price}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-gray-600">Brand: </span>
                    <span>{product.brand}</span>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">{product.description}</p>
                <button
                  className="w-full bg-primary hover:bg-opacity-90 text-secondary font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                  onClick={() => {
                    const q = encodeURIComponent(`${product.brand} ${product.product_name}`);
                    window.open(`https://www.amazon.com/s?k=${q}`, '_blank');
                  }}
                >
                  <ShoppingBag fontSize="small" />
                  Shop at Amazon
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default ProductDetailSidebar;
