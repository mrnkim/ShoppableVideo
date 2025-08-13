import React, { useEffect, useRef, useCallback } from 'react';
import { ShoppingBag, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
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
  const productRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveProductRef = useRef<string | null>(null);

      // Handle user scroll detection
  const handleScroll = useCallback(() => {
    isUserScrollingRef.current = true;

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Reset user scrolling flag after 2 seconds of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 2000);
  }, []);

  // Reset manual toggled state when products change
  useEffect(() => {
    if (products.length === 0) {
      // Clear manual toggled state when products are cleared
      // This will be handled by the parent component
    }
  }, [products.length]);

  // Add scroll listener
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (sidebar) {
      sidebar.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        sidebar.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [handleScroll]);

    // Auto-scroll to active product when currentTime changes (only if user is not scrolling)
  useEffect(() => {
    if (products.length === 0 || isUserScrollingRef.current) return;

    // Find all active products at current time
    const activeProducts = products.filter(product =>
      currentTime >= product.timeline[0] && currentTime <= product.timeline[1]
    );

    if (activeProducts.length === 0) {
      lastActiveProductRef.current = null;
      return;
    }

    // Sort by duration (shortest first) to prioritize products with shorter timeslots
    const prioritizedProduct = activeProducts.reduce((shortest, current) => {
      const shortestDuration = shortest.timeline[1] - shortest.timeline[0];
      const currentDuration = current.timeline[1] - current.timeline[0];
      return currentDuration < shortestDuration ? current : shortest;
    });

    if (prioritizedProduct && sidebarRef.current) {
      const uniqueKey = `${prioritizedProduct.brand}-${prioritizedProduct.product_name}-${prioritizedProduct.timeline[0]}-${prioritizedProduct.timeline[1]}`;

      // Only scroll if the active product has changed
      if (lastActiveProductRef.current !== uniqueKey) {
        lastActiveProductRef.current = uniqueKey;
        const productElement = productRefs.current[uniqueKey];

        if (productElement) {
          productElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }
    }
  }, [currentTime, products]);
  if (!products.length && !isLoading) {
    return (
      <div className="bg-white rounded-[45.06px] p-6 mb-6 text-center h-full">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Discover Products</h2>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-[45.06px] p-6 mb-6 text-center h-full">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold mb-4">Discover Products</h2>
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={sidebarRef}
      className="bg-white rounded-[45.06px] p-4 mb-6 overflow-y-auto max-h-[calc(100vh-360px)] product-sidebar"
    >
      {products.map((product, index) => {
        const uniqueKey = `${product.brand}-${product.product_name}-${product.timeline[0]}-${product.timeline[1]}`;
        const isCollapsed = collapsedProducts[uniqueKey];
        const reactKey = `product-${index}`;

        const isActive = currentTime >= product.timeline[0] && currentTime <= product.timeline[1];
        const isManuallyToggled = manualToggled[uniqueKey];
        const shouldEnableShopButton = isActive;

        const textColor = isActive ? 'text-black' : 'text-gray-400';
        const titleColor = isActive ? 'text-black' : 'text-gray-500';

        return (
          <div
            key={reactKey}
            className="mb-6"
            ref={(el) => {
              productRefs.current[uniqueKey] = el;
            }}
          >
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
                  title={product.product_name}
                >
                  {product.product_name}
                </span>
                <button
                  className={`ml-2 flex-shrink-0 ${isActive ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'}`}
                  onClick={() => {
                    if (!isActive) {
                      onToggleCollapse(product.product_name, product.brand, product.timeline);
                    }
                  }}
                  disabled={isActive}
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
                      title={product.product_name}
                    >
                      {product.product_name}
                    </h2>
                  </div>
                  <button
                    className={`ml-2 flex-shrink-0 ${isActive ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'}`}
                    onClick={() => {
                      if (!isActive) {
                        onToggleCollapse(product.product_name, product.brand, product.timeline);
                      }
                    }}
                    disabled={isActive}
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
                      ? 'bg-black hover:bg-opacity-90 text-white'
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
