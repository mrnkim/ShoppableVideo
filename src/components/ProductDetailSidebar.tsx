import React, { useEffect } from 'react';
import { ShoppingBag, LocalMall, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { ProductDetailSidebarProps } from '@/lib/types';

const ProductDetailSidebar: React.FC<ProductDetailSidebarProps> = React.memo(({
  products,
  collapsedProducts,
  manualToggled,
  onToggleCollapse,
  isLoading = false,
  currentTime = 0,
  onProductClick,
}) => {
  // Reset manual toggled state when products change
  useEffect(() => {
    if (products.length === 0) {
      // Clear manual toggled state when products are cleared
      // This will be handled by the parent component
    }
  }, [products.length]);
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
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing video content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[45.06px] shadow-lg p-4 mb-6 overflow-y-auto max-h-[calc(100vh-360px)] product-sidebar">
      {products.map((product, index) => {
        const uniqueKey = `${product.brand}-${product.product_name}-${product.timeline[0]}-${product.timeline[1]}`;
        const isCollapsed = collapsedProducts[uniqueKey];
        const reactKey = `product-${index}`;

        const isActive = currentTime >= product.timeline[0] && currentTime <= product.timeline[1];
        const isManuallyToggled = manualToggled[uniqueKey];
        const shouldEnableShopButton = isActive || isManuallyToggled;

        const textColor = isActive ? 'text-black' : 'text-gray-400';
        const titleColor = isActive ? 'text-black' : 'text-gray-500';

        return (
          <div key={reactKey} className="mb-6">
            {isCollapsed ? (
              <div className="flex items-center gap-3">
                <div
                  className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                    isActive ? 'bg-blue-100 text-blue-800 border border-black' : 'bg-gray-100 text-gray-500'
                  }`}
                  onClick={() => onProductClick?.(product)}
                >
                  {Math.floor(product.timeline[0] / 60)}:{(Math.floor(product.timeline[0]) % 60).toString().padStart(2, '0')} - {Math.floor(product.timeline[1] / 60)}:{(Math.floor(product.timeline[1]) % 60).toString().padStart(2, '0')}
                </div>
                <span
                  className={`text-xl font-semibold truncate flex-1 cursor-pointer ${titleColor}`}
                  onClick={() => onProductClick?.(product)}
                >
                  {product.product_name}
                </span>
                <button
                  className="ml-2 flex-shrink-0"
                  onClick={() => onToggleCollapse(product.product_name, product.brand, product.timeline)}
                  aria-label="펼치기"
                >
                  <KeyboardArrowDown />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div
                  className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                    isActive ? 'bg-blue-100 text-blue-800 border border-black' : 'bg-gray-100 text-gray-500'
                  }`}
                  onClick={() => onProductClick?.(product)}
                >
                      {Math.floor(product.timeline[0] / 60)}:{(Math.floor(product.timeline[0]) % 60).toString().padStart(2, '0')} - {Math.floor(product.timeline[1] / 60)}:{(Math.floor(product.timeline[1]) % 60).toString().padStart(2, '0')}
                    </div>
                    <h2
                      className={`text-xl font-semibold truncate cursor-pointer ${titleColor}`}
                      onClick={() => onProductClick?.(product)}
                    >
                      {product.product_name}
                    </h2>
                  </div>
                  <button
                    className="ml-2 flex-shrink-0"
                    onClick={() => onToggleCollapse(product.product_name, product.brand, product.timeline)}
                    aria-label="접기"
                  >
                    <KeyboardArrowUp />
                  </button>
                </div>
                <div className="mb-4">
                  {product.price &&
                   product.price.toLowerCase() !== 'unknown' &&
                   product.price.toLowerCase() !== 'not provided in the video' &&
                   product.price.toLowerCase() !== 'not specified' &&
                   product.price.toLowerCase() !== 'not mentioned in the video' &&
                   product.price.toLowerCase() !== 'not available' &&
                   product.price.toLowerCase() !== 'none' &&
                   product.price.toLowerCase() !== 'none visible' &&
                   product.price.toLowerCase() !== 'not explicitly visible' &&
                   product.price.trim() !== '' && (
                    <div className="mb-2">
                      <span className={`${textColor}`}>Price: </span>
                      <span className={`font-semibold ${textColor}`}>{product.price}</span>
                    </div>
                  )}
                  {product.brand &&
                   product.brand.toLowerCase() !== 'unknown' &&
                   product.brand.toLowerCase() !== 'not provided in the video' &&
                   product.brand.toLowerCase() !== 'not specified' &&
                   product.brand.toLowerCase() !== 'not mentioned in the video' &&
                   product.brand.toLowerCase() !== 'not available' &&
                   product.brand.toLowerCase() !== 'none' &&
                   product.brand.toLowerCase() !== 'none visible' &&
                   product.brand.toLowerCase() !== 'unbranded' &&
                   product.brand.toLowerCase() !== 'not explicitly visible' &&
                   product.brand.trim() !== '' && (
                    <div className="mb-2">
                      <span className={`${textColor}`}>Brand: </span>
                      <span className={`${textColor}`}>{product.brand}</span>
                    </div>
                  )}
                </div>
                <p className={`mb-4 ${textColor}`}>{product.description}</p>
                <button
                  className={`w-full font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 ${
                    shouldEnableShopButton
                      ? 'bg-primary hover:bg-opacity-90 text-secondary'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (shouldEnableShopButton) {
                      // Define filtered brand terms that should not be included in search
                      const filteredBrandTerms = [
                        'unknown',
                        'not provided in the video',
                        'not specified',
                        'not mentioned in the video',
                        'not available',
                        'none',
                        'none visible',
                        'unbranded',
                        'not explicitly visible'
                      ];

                      // Check if brand should be filtered out
                      const shouldFilterBrand = product.brand &&
                        filteredBrandTerms.includes(product.brand.toLowerCase().trim());

                      // Create search query
                      let searchQuery;
                      if (shouldFilterBrand) {
                        // Use only product name if brand is filtered
                        searchQuery = product.product_name;
                      } else {
                        // Use brand + product name if brand is valid
                        searchQuery = `${product.brand} ${product.product_name}`;
                      }

                      const q = encodeURIComponent(searchQuery);
                      window.open(`https://www.amazon.com/s?k=${q}`, '_blank');
                    }
                  }}
                  disabled={!shouldEnableShopButton}
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
