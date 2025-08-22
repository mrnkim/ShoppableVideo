"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProductVideoPlayer } from '@/components/ProductVideoPlayer';
import ProductDetailSidebar from '@/components/ProductDetailSidebar';
import { ProductInfo } from '@/lib/types';
import { VideoItem, VideoDetail } from '@/lib/types';


export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [collapsedProducts, setCollapsedProducts] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [manualToggled, setManualToggled] = useState<Record<string, boolean | undefined>>({});
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // New state for video management
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [isLoadingVideoDetail, setIsLoadingVideoDetail] = useState<boolean>(false);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState<boolean>(false);
  const [videoDetail, setVideoDetail] = useState<VideoDetail | null>(null);
  const [videoPlayer, setVideoPlayer] = useState<{ seekTo: (time: number) => void } | null>(null);

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
      // No videos found - just show empty state
    } catch (error) {
      console.error('Error loading videos:', error);
      // No fallback - just show empty state
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

    // Clear previous video's product data when loading new video detail
    setProducts([]);
    setCollapsedProducts({});
    setManualToggled({});
    setCurrentTime(0);
    setIsAnalyzingVideo(true); // Start with analyzing state
    try {
      const response = await fetch(`/api/videos/${videoId}?indexId=${defaultIndexId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch video detail: ${response.statusText}`);
      }

      const data = await response.json();
      setVideoDetail(data);

      // Check if custom metadata exists and generate if needed BEFORE setting video URL
      await checkAndGenerateMetadata(videoId, defaultIndexId, data);

      // Set video URL from HLS data if available (AFTER metadata check)
      if (data.hls?.video_url) {
        setVideoUrl(data.hls.video_url);
      } else {
        // If no HLS URL available, show error
        setVideoUrl('');
        console.warn('No HLS video URL available for this video');
      }
    } catch (error) {
      console.error('❌ Error loading video detail:', error);
      setVideoUrl('');
    } finally {
      setIsLoadingVideoDetail(false);
    }
  }, []);

  // Check and generate metadata if needed
  const checkAndGenerateMetadata = useCallback(async (videoId: string, indexId: string, videoData: VideoDetail, forceReanalyze = false) => {
    // 1) Use existing metadata if present (unless forceReanalyze)
    if (!forceReanalyze && videoData.user_metadata && Object.keys(videoData.user_metadata).length > 0) {
      if (videoData.user_metadata.products) {
        let existingProducts;
        try {
          // Parse products if it's stored as JSON string
          if (typeof videoData.user_metadata.products === 'string') {
            existingProducts = JSON.parse(videoData.user_metadata.products);
          } else {
            existingProducts = videoData.user_metadata.products;
          }

          setProducts(existingProducts);

          // Initialize all products as collapsed
          const initialCollapsedState: Record<string, boolean> = {};
          existingProducts.forEach((product: ProductInfo) => {
            const uniqueKey = `${product.brand}-${product.product_name}-${product.timeline[0]}-${product.timeline[1]}`;
            initialCollapsedState[uniqueKey] = true;
          });
          setCollapsedProducts(initialCollapsedState);
        } catch (parseError) {
          console.error('❌ Error parsing existing products:', parseError);
          setProducts([]);
        }
      }
      setIsAnalyzingVideo(false); // Stop analyzing when using existing metadata
      return;
    }

    // 2) Otherwise, analyze now
    setIsAnalyzingVideo(true);

    try {
      const analyzeResponse = await fetch(`/api/analyze?videoId=${videoId}${forceReanalyze ? '&forceReanalyze=true' : ''}`);

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        console.error('❌ Analyze API error:', errorText);
        throw new Error(`Failed to analyze video: ${analyzeResponse.statusText} - ${errorText}`);
      }

      const analyzeData = await analyzeResponse.json();

      // Extract products from the analysis response
      if (analyzeData.data) {
        let products = [];
        try {
          let jsonString = analyzeData.data;

          products = JSON.parse(jsonString);

          if (!Array.isArray(products)) {
            throw new Error('Parsed data is not an array');
          }
        } catch (parseError) {
          console.error('❌ Error parsing JSON from analysis response:', parseError);
          throw new Error(`Failed to parse products data: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
        }

        // Save the generated metadata
        const saveRequestBody = {
          videoId: videoId,
          indexId: indexId,
          metadata: {
            products: products,
            analyzed_at: new Date().toISOString(),
            reanalyzed: forceReanalyze
          }
        };

        const saveResponse = await fetch('/api/videos/saveMetadata', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saveRequestBody)
        });


        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          console.error('❌ Save API error:', errorText);
          throw new Error(`Failed to save metadata: ${saveResponse.statusText} - ${errorText}`);
        }

        const saveResult = await saveResponse.json();

        // Update local state with the generated products
        setProducts(products);

        // Initialize all products as collapsed
        const initialCollapsedState: Record<string, boolean> = {};
        products.forEach(product => {
          const uniqueKey = `${product.brand}-${product.product_name}-${product.timeline[0]}-${product.timeline[1]}`;
          initialCollapsedState[uniqueKey] = true;
        });
        setCollapsedProducts(initialCollapsedState);
      } else {
        console.warn('⚠️ No data field in analysis response');
        throw new Error('No data field received from analysis');
      }
    } catch (error) {
      console.error('❌ Error generating metadata:', error);
      // No fallback - just show empty state
      setProducts([]);
    } finally {
      setIsAnalyzingVideo(false);
    }
  }, []);

  // Handle video selection
  const handleVideoSelect = useCallback((videoId: string) => {

    // Clear previous video's product data
    setProducts([]);
    setCollapsedProducts({});
    setManualToggled({});
    setCurrentTime(0);

    // Reset analysis state
    setIsAnalyzingVideo(false);

    // Update selected video and load details
    setSelectedVideoId(videoId);
    loadVideoDetail(videoId);
  }, [loadVideoDetail]);

  // Detect products in the video
  const handleDetectProducts = useCallback(async () => {
    // If we already have products from metadata analysis, use them
    if (products.length > 0) {
      return;
    }

    // No products available - just show empty state
    setProducts([]);
    setCollapsedProducts({});
  }, [products.length]);


  // Handle product selection
  const handleProductSelect = useCallback((product: ProductInfo) => {
    // Currently not used, but keeping for future functionality
  }, []);

  const handleToggleCollapse = (productName: string, brand: string, timeline: [number, number]) => {
    const uniqueKey = `${brand}-${productName}-${timeline[0]}-${timeline[1]}`;
    setCollapsedProducts((prev) => ({
      ...prev,
      [uniqueKey]: !prev[uniqueKey],
    }));
    setManualToggled((prev) => ({
      ...prev,
      [uniqueKey]: true,
    }));
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
    setCollapsedProducts((prev) => {
      let changed = false;
      const newState = { ...prev };
      const currentProducts = products;

      currentProducts.forEach((p) => {
        const uniqueKey = `${p.brand}-${p.product_name}-${p.timeline[0]}-${p.timeline[1]}`;
        if (time >= p.timeline[0] && time <= p.timeline[1]) {
          if (manualToggled[uniqueKey]) {
            setManualToggled((prevManual) => ({
              ...prevManual,
              [uniqueKey]: undefined,
            }));
          }
          if (prev[uniqueKey] !== false) {
            newState[uniqueKey] = false;
            changed = true;
          }
        } else if (time > p.timeline[1]) {
          if (manualToggled[uniqueKey]) {
            return;
          }
          if (prev[uniqueKey] !== true) {
            newState[uniqueKey] = true;
            changed = true;
          }
        }
      });
      return changed ? newState : prev;
    });
  }, [manualToggled, products]);

  // Handle video player ready
  const handlePlayerReady = useCallback((player: { seekTo: (time: number) => void }) => {
    setVideoPlayer(player);
  }, []);

  // Handle product click to seek to timeline
  const handleProductClick = useCallback((product: ProductInfo) => {
    if (videoPlayer) {
      videoPlayer.seekTo(product.timeline[0]);
    }
  }, [videoPlayer]);

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
    <div className="flex flex-col gap-6">
      {/* Header section - full width */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Shoppable Video Experience</h1>
        <p className="mb-6">
          Discover and purchase products directly from a video without interrupting playback
        </p>
        {/* Video Selection Dropdown */}
        <div className="mb-6">
          <div className="relative w-full mx-auto rounded-lg">
            {/* Dropdown button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              disabled={isLoadingVideos}
              className={`cursor-pointer w-full text-left rounded-3xl py-3 px-5 font-sans text-black text-lg relative ${
                selectedVideoId ? 'bg-zinc-100 border-2 border-black' : 'bg-zinc-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="truncate pr-8">
                  {isLoadingVideos ? "Loading videos..." :
                   videos.length === 0 ? "No videos available" :
                   selectedVideoId ? getVideoDisplayName(videos.find(v => v._id === selectedVideoId)!) : "Select a video"}
                </div>
                <div className="text-lg transform transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  &#x2303;
                </div>
              </div>
            </button>

            {/* Dropdown content */}
            {isOpen && (
              <div
                className="absolute left-0 right-0 mt-1 max-h-[40vh] overflow-y-auto bg-white rounded-xl z-50 p-2"
                style={{
                  width: '100%',
                  top: '100%'
                }}
              >
                {videos.map((video) => (
                  <button
                    key={video._id}
                    className={`cursor-pointer rounded-2xl text-left py-2 px-4 hover:bg-gray-100 last:border-0 font-sans w-full ${video._id === selectedVideoId ? 'bg-gray-200' : ''}`}
                    onClick={() => {
                      handleVideoSelect(video._id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="text-md truncate">
                      {getVideoDisplayName(video)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video and Sidebar container */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Video Player */}
        <div className="lg:w-2/3">
          {videoUrl ? (
            <div className="">
              <ProductVideoPlayer
                videoUrl={videoUrl}
                products={products}
                onProductSelect={handleProductSelect}
                onTimeUpdate={handleTimeUpdate}
                autoPlay={true}
                onPlayerReady={handlePlayerReady}
              />
            </div>
          ) : (
            <div className="w-full rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {isAnalyzingVideo ? 'Analyzing video content...' : 'Loading video...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Product Detail Sidebar */}
        <div className="lg:w-1/3">
          <div className="h-[350px]">
            <ProductDetailSidebar
              products={products}
              collapsedProducts={collapsedProducts}
              manualToggled={manualToggled}
              onToggleCollapse={handleToggleCollapse}
              isLoading={isAnalyzingVideo}
              currentTime={currentTime}
              onProductClick={handleProductClick}
            />
          </div>
        </div>
      </div>

      {/* How it works section - full width */}
      <div className="p-6 bg-gray-200 rounded-[45.60px]">
        <h2 className="text-lg font-semibold mb-2">💡 How it works</h2>
                <div className="text-sm leading-relaxed">
          <p>1. This app loads videos from a TwelveLabs Index and uses the TwelveLabs Analyze API to extract detailed product information.</p>
          <p>2. The API detects every product appearing in a video, describes how each one is presented, pinpoints its on-screen location, and includes brand and pricing information when available.</p>
          <p>3. Product details are then displayed in a sidebar, along with timestamps indicating when each item appears.</p>
        </div>
      </div>
    </div>
  );
}
