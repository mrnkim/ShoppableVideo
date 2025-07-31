"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProductVideoPlayer } from '@/components/ProductVideoPlayer';
import ProductDetailSidebar from '@/components/ProductDetailSidebar';
import ShoppingCart from '@/components/ShoppingCart';
import { ProductDetection, RelatedProduct } from '@/lib/twelvelabs';
import { useTwelveLabs } from '@/contexts/TwelveLabsContext';
import { useCart } from '@/contexts/CartContext';
import { Info, ShoppingBag } from '@mui/icons-material';

// Demo video URL for when no video is selected
const DEMO_VIDEO_URL = "/breakfast_burrito.mp4";

// Mock products for demonstration when API is not available
const MOCK_PRODUCTS: ProductDetection[] = [
  {
    "timeline": [13.0, 16.0],
    "brand": "Jennie-O",
    "product_name": "93% lean-7% fat fresh-ground turkey",
    "location": [960, 540, 100, 50],
    "price": "Not specified",
    "description": "The ground turkey is displayed on a countertop and its packaging label is shown, highlighting its nutritional information."
    },
    {
    "timeline": [13.0, 16.0],
    "brand": "Unknown",
    "product_name": "Whipped Low Fat Cottage Cheese Spreadable",
    "location": [1000, 560, 80, 40],
    "price": "Not specified",
    "description": "The cottage cheese is displayed on a countertop and later its nutrition facts label is focused on in a close-up shot."
    },
    {
    "timeline": [13.0, 16.0],
    "brand": "Unknown",
    "product_name": "White eggs",
    "location": [1040, 580, 60, 40],
    "price": "Not specified",
    "description": "The eggs are shown nestled within a cardboard carton and later used in the recipe."
    },
    {
    "timeline": [13.0, 16.0],
    "brand": "Unknown",
    "product_name": "Kale leaves",
    "location": [1100, 600, 70, 50],
    "price": "Not specified",
    "description": "The kale leaves are displayed on a countertop and later added to the skillet with the ground turkey mixture."
    },
    {
    "timeline": [216.0, 224.0],
    "brand": "Unknown",
    "product_name": "Flat piece of dough",
    "location": [960, 540, 100, 50],
    "price": "Not specified",
    "description": "The dough is shown resting on parchment paper next to a rolling pin, indicating it is part of the burrito-making process."
    }
  // {
  //   "timeline": [8.0, 9.0],
  //   "brand": "Google",
  //   "product_name": "Chromecast",
  //   "location": [1000, 600, 100, 100],
  //   "price": "$35",
  //   "description": "The Chromecast is shown being plugged into an HDMI port, and the text 'Everything you love now on your TV.' appears on the screen, implying that it allows streaming of content directly to a TV."
  // }
  // {
  //   id: "p1",
  //   name: "Vintage Leather Jacket",
  //   description: "Premium quality leather jacket with distressed finish",
  //   price: 199.99,
  //   category: "Apparel",
  //   position: { x: 45, y: 30 },
  //   timeAppearance: [3, 15],
  //   confidence: 0.92,
  //   aiGeneratedContext: "This rugged leather jacket is perfect for casual outings. The actor is wearing it in an outdoor setting, suggesting it's suitable for fall weather."
  // },
  // {
  //   id: "p2",
  //   name: "Smart Watch Pro",
  //   description: "Next-gen smartwatch with health monitoring features",
  //   price: 299.99,
  //   category: "Electronics",
  //   position: { x: 70, y: 40 },
  //   timeAppearance: [8, 20],
  //   confidence: 0.87,
  //   aiGeneratedContext: "The smartwatch shown in this active scene provides fitness tracking and notification features. The character checks it frequently, highlighting its practical everyday use."
  // },
  // {
  //   id: "p3",
  //   name: "Designer Sunglasses",
  //   description: "UV protected polarized designer sunglasses",
  //   price: 149.99,
  //   category: "Accessories",
  //   position: { x: 30, y: 20 },
  //   timeAppearance: [12, 25],
  //   confidence: 0.89,
  //   aiGeneratedContext: "These stylish sunglasses appear in the bright outdoor scene, providing both UV protection and a fashionable look that complements the character's outfit."
  // }
];

// Mock related products
const MOCK_RELATED_PRODUCTS: RelatedProduct[] = [
  {
    id: "r1",
    name: "Denim Jeans",
    description: "Classic blue denim jeans with straight fit",
    price: 89.99,
    category: "Apparel",
    whyRecommended: "These jeans pair perfectly with the leather jacket for a complete casual look."
  },
  {
    id: "r2",
    name: "Leather Boots",
    description: "Premium leather boots with rubber sole",
    price: 149.99,
    category: "Footwear",
    whyRecommended: "Complete the rugged outdoor look with these matching leather boots."
  }
];

export default function Home() {
  // TwelveLabs context
  const {
    client,
    isInitialized,
    currentVideo,
    currentIndex,
    detectProducts,
    findRelatedProducts,
    isDetectingProducts,
    isFindingRelatedProducts,
    error
  } = useTwelveLabs();

  // Cart context
  const { addItem, updateQuantity, items, isCartOpen, toggleCart, clearCart } = useCart();

  // State variables
  const [videoUrl, setVideoUrl] = useState<string>(DEMO_VIDEO_URL);
  const [products, setProducts] = useState<ProductDetection[]>([]);
  const [visibleProducts, setVisibleProducts] = useState<ProductDetection[]>([]);
  const [collapsedProducts, setCollapsedProducts] = useState<Record<string, boolean>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [isLoadingRelated, setIsLoadingRelated] = useState<boolean>(false);
  const [useMockData, setUseMockData] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Detect products in the video
  const handleDetectProducts = useCallback(async () => {
    if (!currentVideo || !currentIndex) {
      // Use mock data if no video or index is selected
      setUseMockData(true);
      setProducts(MOCK_PRODUCTS);
      return;
    }

    setIsLoadingProducts(true);
    setUseMockData(false);

    try {
      // Use the TwelveLabs client to detect products
      const detectedProducts = await detectProducts(currentIndex._id, currentVideo._id);
      setProducts(detectedProducts);
    } catch (error) {
      console.error("Error detecting products:", error);
      // Fallback to mock data if API fails
      setProducts(MOCK_PRODUCTS);
      setUseMockData(true);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [currentVideo, currentIndex, detectProducts]);

  // Find related products when a product is selected
  const handleFindRelatedProducts = useCallback(async (product: ProductDetection) => {
    if (!currentIndex || useMockData) {
      setRelatedProducts(MOCK_RELATED_PRODUCTS);
      return;
    }

    setIsLoadingRelated(true);

    try {
      // Use the TwelveLabs client to find related products
      const related = await findRelatedProducts({
        indexId: currentIndex._id,
        productId: product.product_name,
        category: "Electronics",
        productName: product.product_name,
        timeRange: product.timeline,
        limit: 4
      });
      setRelatedProducts(related);
    } catch (error) {
      console.error("Error finding related products:", error);
      setRelatedProducts(MOCK_RELATED_PRODUCTS);
    } finally {
      setIsLoadingRelated(false);
    }
  }, [currentIndex, findRelatedProducts, useMockData]);

  // Handle product selection
  const handleProductSelect = useCallback((product: ProductDetection) => {
    setSelectedProduct(product);
    handleFindRelatedProducts(product);
  }, [handleFindRelatedProducts]);

  const handleVisibleProductsChange = useCallback((products: ProductDetection[]) => {
    setVisibleProducts(products);
  }, []);

  const handleToggleCollapse = useCallback((productName: string) => {
    setCollapsedProducts((prev) => ({
      ...prev,
      [productName]: !prev[productName],
    }));
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
    setCollapsedProducts((prev) => {
      const newState = { ...prev };
      MOCK_PRODUCTS.forEach((p) => {
        if (time > p.timeline[1] && prev[p.product_name] !== false) {
          newState[p.product_name] = true;
        }
      });
      return newState;
    });
  }, []);

  // Handle related product selection
  const handleRelatedProductSelect = (product: RelatedProduct) => {
    addItem(product);
  };

  // Handle checkout
  const handleCheckout = () => {
    alert("Checkout process would be implemented here in a real application");
    clearCart();
  };

  // Initialize products when component mounts or when video/index changes
  useEffect(() => {
    if (currentVideo) {
      // Set video URL from current video if available
      // In a real app, you would get the URL from the TwelveLabs API
      // For demo, we'll continue using the demo URL
      setVideoUrl(DEMO_VIDEO_URL);
    }

    // Detect products with a small delay to ensure video is loaded
    // This helps maintain the <2s latency requirement
    const timer = setTimeout(() => {
      handleDetectProducts();
    }, 500);

    return () => clearTimeout(timer);
  }, [currentVideo, currentIndex, handleDetectProducts]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-2/3">
        <h1 className="text-2xl font-bold mb-4">Shoppable Video Experience</h1>

        <div className="flex items-center mb-6 text-sm">
          <div className={`px-3 py-1 rounded-full mr-3 flex items-center ${useMockData ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
            <span className="w-2 h-2 rounded-full mr-2 bg-current"></span>
            {useMockData ? 'Demo Mode' : 'API Connected'}
          </div>

          {isLoadingProducts && (
            <div className="flex items-center text-blue-600">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
              Detecting Products...
            </div>
          )}
        </div>

        <p className="text-gray-600 mb-6">
          Discover and purchase products directly from this video without interrupting playback.
        </p>

        {/* Video Player with Product Overlays */}
        <ProductVideoPlayer
          videoUrl={DEMO_VIDEO_URL}
          products={MOCK_PRODUCTS}
          onVisibleProductsChange={handleVisibleProductsChange}
          onTimeUpdate={handleTimeUpdate}
          autoPlay={true}
        />

        {/* Video Description */}
        {/* <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold">About This Video</h2>
          <p className="text-gray-600 mt-2">
            This demo showcases how AI-powered video understanding can transform the viewing experience
            into a shopping opportunity. Products are detected in real-time using TwelveLabs' deep
            semantic search capabilities, allowing viewers to discover and purchase items without
            interrupting their viewing experience.
          </p>
        </div> */}

        {/* Technology Explanation */}
        {/* <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800">Powered by TwelveLabs AI</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded shadow-sm">
              <h3 className="font-medium text-blue-700">TwelveLabs Search API</h3>
              <p className="text-sm text-gray-600 mt-1">
                Enables natural language queries like "red dress in dance scene" to pinpoint products with frame accuracy.
              </p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <h3 className="font-medium text-blue-700">TwelveLabs Analyze API</h3>
              <p className="text-sm text-gray-600 mt-1">
                Creates tailored product descriptions using video context (e.g., "Windproof jacket shown in mountain summit scene").
              </p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <h3 className="font-medium text-blue-700">TwelveLabs Embed API</h3>
              <p className="text-sm text-gray-600 mt-1">
                Powers "Similar Styles" recommendations by analyzing visual/textual product attributes.
              </p>
            </div>
          </div>
        </div> */}
      </div>

      <div className="lg:w-1/3">
        {/* Product Detail Sidebar */}
        <ProductDetailSidebar
          products={MOCK_PRODUCTS.filter(p => currentTime >= p.timeline[0])}
          collapsedProducts={collapsedProducts}
          onToggleCollapse={handleToggleCollapse}
          relatedProducts={MOCK_RELATED_PRODUCTS}
          onClose={() => {}}
          onAddToCart={() => {}}
          onRelatedProductSelect={() => {}}
          isLoading={false}
        />

        {/* Shopping Cart */}
        {/* <ShoppingCart
          items={items}
          onUpdateQuantity={updateQuantity}
          onCheckout={handleCheckout}
          isOpen={isCartOpen}
          onToggle={toggleCart}
        /> */}

        {/* Additional Info */}
        {/* {!selectedProduct && (
          <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-700 mb-2">How It Works</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
              <li>Play the video to see product markers appear</li>
              <li>Click on a product marker to view details</li>
              <li>Add products to your cart</li>
              <li>Explore similar product recommendations</li>
              <li>Complete your purchase without leaving the video</li>
            </ol>
          </div>
        )} */}
      </div>
    </div>
  );
}
