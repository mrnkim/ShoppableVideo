import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { LocalMall, Pause, PlayArrow } from '@mui/icons-material';
import { ProductDetection } from '@/lib/twelvelabs';

interface ProductVideoPlayerProps {
  videoUrl: string;
  products: ProductDetection[];
  onProductSelect: (product: ProductDetection) => void;
  width?: string | number;
  height?: string | number;
  autoPlay?: boolean;
  onVisibleProductsChange?: (products: ProductDetection[]) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayerReady?: (player: { seekTo: (time: number) => void }) => void;
}

const ProductVideoPlayer: React.FC<ProductVideoPlayerProps> = ({
  videoUrl,
  products,
  onProductSelect,
  width = '100%',
  height = '100%',
  autoPlay = true,
  onVisibleProductsChange,
  onTimeUpdate,
  onPlayerReady,
}) => {
  const [playing, setPlaying] = useState<boolean>(autoPlay);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [visibleProducts, setVisibleProducts] = useState<ProductDetection[]>([]);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const playerRef = useRef<ReactPlayer>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Update current time and visible products
  const handleProgress = (state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);
    if (onTimeUpdate) {
      onTimeUpdate(state.playedSeconds);
    }

    // Filter products that should be visible at current time
    const productsToShow = products.filter(
      product =>
        currentTime >= product.timeline[0] &&
        currentTime <= product.timeline[1]
    );

    setVisibleProducts(productsToShow);
  };

  // Handle play/pause toggle
  const togglePlayPause = () => {
    setPlaying(!playing);
  };

  // Handle video duration loaded
  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  // Handle video ready
  const handleReady = () => {
    if (onPlayerReady) {
      onPlayerReady({
        seekTo: (time: number) => {
          if (playerRef.current) {
            playerRef.current.seekTo(time);
          }
        }
      });
    }
  };

  // Show/hide controls when hovering over video
  const handleMouseEnter = () => {
    setIsHovering(true);
    setControlsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    // Only hide controls if video is playing
    if (playing) {
      setTimeout(() => {
        if (!isHovering) {
          setControlsVisible(false);
        }
      }, 2000);
    }
  };

  // Format time for display (mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate position for product markers using percentage-based coordinates
  const calculateMarkerPosition = (product: ProductDetection) => {
    // location is now in percentages: [x%, y%, width%, height%]
    const [xPercent, yPercent] = product.location;

    return {
      left: `${xPercent}%`,
      top: `${yPercent}%`,
    };
  };

  // Seek to a specific time when clicking on the progress bar
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !playerContainerRef.current) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const seekTime = duration * clickPosition;

    playerRef.current.seekTo(seekTime);
  };

  useEffect(() => {
    if (onVisibleProductsChange) {
      onVisibleProductsChange(visibleProducts);
    }
  }, [visibleProducts, onVisibleProductsChange]);

  return (
    <div
      className="video-container relative rounded-lg overflow-hidden shadow-lg bg-black"
      ref={playerContainerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ReactPlayer
        ref={playerRef}
        url={videoUrl}
        width={width}
        height={height}
        playing={playing}
        controls={false} // We're using custom controls
        onProgress={handleProgress}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onDuration={handleDuration}
        onReady={handleReady}
        progressInterval={100} // Update progress more frequently for smoother marker updates
        config={{
          file: {
            attributes: {
              crossOrigin: "anonymous",
              controlsList: "nodownload",
            },
          },
        }}
      />

      {/* Product Markers Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {visibleProducts.map(product => {
          const position = calculateMarkerPosition(product);
          return (
            <button
              key={product.product_name}
              className="product-marker absolute rounded-full bg-primary bg-opacity-70 flex items-center justify-center cursor-pointer pointer-events-auto animate-pulse-slow transition-transform duration-300 ease-in-out hover:scale-110"
              style={{
                left: position.left,
                top: position.top,
                width: '32px', // Fixed width for the marker
                height: '32px', // Fixed height for the marker
                transform: 'translate(-50%, -50%)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onProductSelect(product);
                setPlaying(false);
              }}
              aria-label={`View ${product.product_name} details`}
            >
              <LocalMall className="text-white" style={{ fontSize: '16px' }} />
            </button>
          );
        })}
      </div>

      {/* Custom Video Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Progress bar */}
        <div
          className="w-full h-1 bg-gray-600 rounded-full mb-3 cursor-pointer"
          onClick={handleProgressBarClick}
        >
          <div
            className="h-full bg-primary rounded-full relative"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={togglePlayPause}
              className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause fontSize="small" className="text-white" /> : <PlayArrow fontSize="small" className="text-white" />}
            </button>
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="text-white text-sm">
            {visibleProducts.length > 0 && (
              <span className="flex items-center">
                <LocalMall fontSize="small" className="mr-1" />
                {visibleProducts.length} product{visibleProducts.length !== 1 ? 's' : ''} available
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductVideoPlayer;
// Provide a named export so consumers can import either:
//   import ProductVideoPlayer from '...'
// or
//   import { ProductVideoPlayer } from '...'
export { ProductVideoPlayer };
