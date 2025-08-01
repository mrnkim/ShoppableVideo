"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProductVideoPlayer } from '@/components/ProductVideoPlayer';
import ProductDetailSidebar from '@/components/ProductDetailSidebar';
import ShoppingCart from '@/components/ShoppingCart';
import { ProductDetection, RelatedProduct } from '@/lib/twelvelabs';
import { useCart } from '@/contexts/CartContext';
import { Info, ShoppingBag, ExpandMore } from '@mui/icons-material';

// Types for video data from TwelveLabs API
interface VideoItem {
  _id: string;
  created_at: string;
  system_metadata?: {
    filename?: string;
    duration?: number;
    video_title?: string;
    fps?: number;
    height?: number;
    width?: number;
    size?: number;
    model_names?: string[];
  };
  hls?: {
    video_url?: string;
    thumbnail_urls?: string[];
    status?: string;
    updated_at?: string;
  };
}

interface VideoDetail {
  _id: string;
  index_id?: string;
  hls?: {
    video_url?: string;
    thumbnail_urls?: string[];
    status?: string;
    updated_at?: string;
  };
  system_metadata?: {
    filename?: string;
    duration?: number;
    video_title?: string;
    fps?: number;
    height?: number;
    width?: number;
    size?: number;
    model_names?: string[];
  };
  user_metadata?: Record<string, unknown>;
  source?: Record<string, unknown>;
  embedding?: Record<string, unknown>;
}



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

  // Cart context
  const { addItem, updateQuantity, items, isCartOpen, toggleCart, clearCart } = useCart();

  // State variables
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [products, setProducts] = useState<ProductDetection[]>([]);
  const [visibleProducts, setVisibleProducts] = useState<ProductDetection[]>([]);
  const [collapsedProducts, setCollapsedProducts] = useState<Record<string, boolean>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [isLoadingRelated, setIsLoadingRelated] = useState<boolean>(false);
  const [useMockData, setUseMockData] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [manualToggled, setManualToggled] = useState<Record<string, boolean | undefined>>({});
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetection | null>(null);

  // New state for video management
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [isLoadingVideoDetail, setIsLoadingVideoDetail] = useState<boolean>(false);
  const [videoDetail, setVideoDetail] = useState<VideoDetail | null>(null);

  // Load videos from TwelveLabs index
  const loadVideos = useCallback(async () => {
    const defaultIndexId = process.env.NEXT_PUBLIC_DEFAULT_INDEX_ID;
    if (!defaultIndexId) {
      console.error('Default index ID not configured');
      return;
    }

    setIsLoadingVideos(true);
    try {
      const response = await fetch(`/api/videos?index_id=${defaultIndexId}&limit=50`);
      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.statusText}`);
      }

      const data = await response.json();
      setVideos(data.data || []);

      // Select the most recent video by default (first in the list since API returns newest first)
      if (data.data && data.data.length > 0) {
        setSelectedVideoId(data.data[0]._id);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      setUseMockData(true);
    } finally {
      setIsLoadingVideos(false);
    }
  }, []);

  // Load video detail when a video is selected
  const loadVideoDetail = useCallback(async (videoId: string) => {
    const defaultIndexId = process.env.NEXT_PUBLIC_DEFAULT_INDEX_ID;
    if (!defaultIndexId || !videoId) {
      return;
    }

    setIsLoadingVideoDetail(true);
    try {
      const response = await fetch(`/api/videos/${videoId}?indexId=${defaultIndexId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch video detail: ${response.statusText}`);
      }

      const data = await response.json();
      setVideoDetail(data);

      // Set video URL from HLS data if available
      if (data.hls?.video_url) {
        setVideoUrl(data.hls.video_url);
      } else {
        // If no HLS URL available, set an empty string
        setVideoUrl('');
        console.warn('No HLS video URL available for this video');
      }
    } catch (error) {
      console.error('Error loading video detail:', error);
      setVideoUrl('');
    } finally {
      setIsLoadingVideoDetail(false);
    }
  }, []);

  // Handle video selection
  const handleVideoSelect = useCallback((videoId: string) => {
    setSelectedVideoId(videoId);
    loadVideoDetail(videoId);
  }, [loadVideoDetail]);

  // Detect products in the video
  const handleDetectProducts = useCallback(async () => {
    // For now, use mock data since we're not using the TwelveLabs context
    setUseMockData(true);
    setProducts(MOCK_PRODUCTS);
  }, []);

  // Find related products when a product is selected
  const handleFindRelatedProducts = useCallback(async (product: ProductDetection) => {
    // For now, use mock data since we're not using the TwelveLabs context
    setRelatedProducts(MOCK_RELATED_PRODUCTS);
  }, []);

  // Handle product selection
  const handleProductSelect = useCallback((product: ProductDetection) => {
    setSelectedProduct(product);
    handleFindRelatedProducts(product);
  }, [handleFindRelatedProducts]);

  const handleVisibleProductsChange = useCallback((products: ProductDetection[]) => {
    setVisibleProducts(products);
  }, []);

  const handleToggleCollapse = (productName: string) => {
    setCollapsedProducts((prev) => ({
      ...prev,
      [productName]: !prev[productName],
    }));
    setManualToggled((prev) => ({
      ...prev,
      [productName]: true,
    }));
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
    setCollapsedProducts((prev) => {
      let changed = false;
      const newState = { ...prev };
      MOCK_PRODUCTS.forEach((p) => {
        if (time >= p.timeline[0] && time <= p.timeline[1]) {
          // 구간 내 진입 시 수동 토글 초기화하고 자동 펼침
          if (manualToggled[p.product_name]) {
            setManualToggled((prevManual) => ({
              ...prevManual,
              [p.product_name]: undefined,
            }));
          }
          if (prev[p.product_name] !== false) {
            newState[p.product_name] = false;
            changed = true;
            console.log(`[DEBUG] ${p.product_name}: 구간 내 → 자동 펼침`);
          }
        } else if (time > p.timeline[1]) {
          if (manualToggled[p.product_name]) {
            // 수동 토글이 있으면 자동 동작 무시
            return;
          }
          if (prev[p.product_name] !== true) {
            newState[p.product_name] = true;
            changed = true;
            console.log(`[DEBUG] ${p.product_name}: 구간 끝 → 자동 접힘`);
          }
        }
      });
      return changed ? newState : prev;
    });
  }, [manualToggled]);

  // Handle related product selection
  const handleRelatedProductSelect = (product: RelatedProduct) => {
    addItem(product);
  };

  // Handle checkout
  const handleCheckout = () => {
    alert("Checkout process would be implemented here in a real application");
    clearCart();
  };

  // Initialize videos when component mounts
  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Load video detail when selected video changes
  useEffect(() => {
    if (selectedVideoId) {
      loadVideoDetail(selectedVideoId);
    }
  }, [selectedVideoId, loadVideoDetail]);

  // Initialize products when component mounts
  useEffect(() => {
    // Detect products with a small delay to ensure video is loaded
    // This helps maintain the <2s latency requirement
    const timer = setTimeout(() => {
      handleDetectProducts();
    }, 500);

    return () => clearTimeout(timer);
  }, [handleDetectProducts]);

  // Get display name for video
  const getVideoDisplayName = (video: VideoItem) => {
    return video.system_metadata?.filename ||
           video.system_metadata?.video_title ||
           `Video ${video._id.slice(-8)}`;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-2/3">
        <h1 className="text-2xl font-bold mb-4">Shoppable Video Experience</h1>

        {/* Video Selection Dropdown */}
        <div className="mb-6">
          <div className="relative">
            <select
              id="video-select"
              value={selectedVideoId}
              onChange={(e) => handleVideoSelect(e.target.value)}
              disabled={isLoadingVideos}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {isLoadingVideos ? (
                <option>Loading videos...</option>
              ) : videos.length === 0 ? (
                <option>No videos available</option>
              ) : (
                videos.map((video) => (
                  <option key={video._id} value={video._id}>
                    {getVideoDisplayName(video)}
                  </option>
                ))
              )}
            </select>
            <ExpandMore className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

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

          {isLoadingVideoDetail && (
            <div className="flex items-center text-blue-600">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading Video...
            </div>
          )}
        </div>

        <p className="text-gray-600 mb-6">
          Discover and purchase products directly from this video without interrupting playback.
        </p>

        {/* Video Player with Product Overlays */}
        <ProductVideoPlayer
          videoUrl={videoUrl}
          products={MOCK_PRODUCTS}
          onProductSelect={handleProductSelect}
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
