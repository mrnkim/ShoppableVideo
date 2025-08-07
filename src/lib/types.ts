/**
 * TwelveLabs API types for the Shoppable Video application
 */

export interface ProductInfo {
  timeline: [number, number];
  brand: string;
  product_name: string;
  location: number[];
  price: string;
  description: string;
}

export interface VideoItem {
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
  user_metadata?: Record<string, unknown>;
}

export interface VideoDetail {
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

export interface ProductDetailSidebarProps {
  products: ProductInfo[];
  collapsedProducts: Record<string, boolean>;
  manualToggled: Record<string, boolean | undefined>;
  onToggleCollapse: (productName: string, brand: string, timeline: [number, number]) => void;
  isLoading?: boolean;
  currentTime?: number;
  onProductClick?: (product: ProductInfo) => void;
}

export interface ProductVideoPlayerProps {
  videoUrl: string;
  products: ProductInfo[];
  onProductSelect: (product: ProductInfo) => void;
  width?: string | number;
  height?: string | number;
  autoPlay?: boolean;
  onVisibleProductsChange?: (products: ProductInfo[]) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayerReady?: (player: { seekTo: (time: number) => void }) => void;
}