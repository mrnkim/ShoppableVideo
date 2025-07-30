import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * TwelveLabs API response types
 */
export interface TwelveLabsVideo {
  _id: string;
  name: string;
  status: 'ready' | 'processing' | 'failed' | string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    fps?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface TwelveLabsIndex {
  _id: string;
  name: string;
  status: 'ready' | 'processing' | 'failed' | string;
  engine_id: string;
  created_at: string;
  updated_at: string;
}

export interface TwelveLabsSearchOptions {
  query: string;
  indexId: string;
  searchOptions?: Array<'visual' | 'conversation' | 'text_in_video' | 'logo' | 'visual_similarity'>;
  groupBy?: 'video' | 'clip';
  pageLimit?: number;
  threshold?: 'low' | 'medium' | 'high';
  confidenceLevel?: number;
  videoId?: string;
  timeRange?: [number, number];
}

export interface TwelveLabsGenerateOptions {
  indexId: string;
  prompt: string;
  videoId?: string;
  timeRange?: [number, number];
}

export interface ProductDetection {
  timeline: [number, number];
  brand: string;
  product_name: string;
  location: number[];
  price: string;
  description: string;
}

export interface RelatedProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image?: string;
  whyRecommended?: string;
}

/**
 * TwelveLabs API client for video understanding and product detection
 */
export class TwelveLabsClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  /**
   * Create a new TwelveLabs API client
   *
   * @param apiKey - TwelveLabs API key
   * @param baseUrl - TwelveLabs API base URL (optional)
   */
  constructor(apiKey: string, baseUrl: string = 'https://api.twelvelabs.io/v1.2') {
    this.apiKey = apiKey;``
    this.baseUrl = baseUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('TwelveLabs API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Upload a video to TwelveLabs
   *
   * @param file - Video file to upload
   * @param filename - Name of the file
   * @returns Promise with the uploaded video information
   */
  async uploadVideo(file: File, filename: string): Promise<TwelveLabsVideo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', filename);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-api-key': this.apiKey
      }
    };

    try {
      const response = await axios.post(`${this.baseUrl}/videos`, formData, config);
      return response.data;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  /**
   * Get information about a specific video
   *
   * @param videoId - ID of the video
   * @returns Promise with the video information
   */
  async getVideo(videoId: string): Promise<TwelveLabsVideo> {
    try {
      const response = await this.client.get(`/videos/${videoId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * List all videos
   *
   * @returns Promise with array of videos
   */
  async listVideos(): Promise<TwelveLabsVideo[]> {
    try {
      const response = await this.client.get('/videos');
      return response.data.data || [];
    } catch (error) {
      console.error('Error listing videos:', error);
      throw error;
    }
  }

  /**
   * Create a new index for videos
   *
   * @param name - Name of the index
   * @param engineId - ID of the engine to use
   * @returns Promise with the created index information
   */
  async createIndex(name: string, engineId: string): Promise<TwelveLabsIndex> {
    try {
      const response = await this.client.post('/indexes', {
        name,
        engine_id: engineId
      });
      return response.data;
    } catch (error) {
      console.error('Error creating index:', error);
      throw error;
    }
  }

  /**
   * Get information about a specific index
   *
   * @param indexId - ID of the index
   * @returns Promise with the index information
   */
  async getIndex(indexId: string): Promise<TwelveLabsIndex> {
    try {
      const response = await this.client.get(`/indexes/${indexId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting index ${indexId}:`, error);
      throw error;
    }
  }

  /**
   * List all indexes
   *
   * @returns Promise with array of indexes
   */
  async listIndexes(): Promise<TwelveLabsIndex[]> {
    try {
      const response = await this.client.get('/indexes');
      return response.data.data || [];
    } catch (error) {
      console.error('Error listing indexes:', error);
      throw error;
    }
  }

  /**
   * Index a video
   *
   * @param indexId - ID of the index
   * @param videoId - ID of the video
   * @returns Promise with the indexing task information
   */
  async indexVideo(indexId: string, videoId: string): Promise<any> {
    try {
      const response = await this.client.post(`/indexes/${indexId}/videos/${videoId}`);
      return response.data;
    } catch (error) {
      console.error(`Error indexing video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Search for content in indexed videos
   *
   * @param options - Search options
   * @returns Promise with search results
   */
  async search(options: TwelveLabsSearchOptions): Promise<any> {
    try {
      const {
        query,
        indexId,
        searchOptions = ['visual', 'conversation', 'text_in_video'],
        groupBy = 'clip',
        pageLimit = 10,
        threshold = 'medium',
        confidenceLevel = 0.6,
        videoId,
        timeRange
      } = options;

      const payload: any = {
        query_text: query,
        index_id: indexId,
        search_options: searchOptions,
        group_by: groupBy,
        page_limit: pageLimit,
        threshold: threshold,
        adjust_confidence_level: confidenceLevel
      };

      // Add optional parameters if provided
      if (videoId) payload.video_id = videoId;
      if (timeRange) payload.time_range = timeRange;

      const response = await this.client.post('/search', payload);
      return response.data;
    } catch (error) {
      console.error('Error searching videos:', error);
      throw error;
    }
  }

  /**
   * Generate content based on video context
   *
   * @param options - Generate options
   * @returns Promise with generated content
   */
  async generate(options: TwelveLabsGenerateOptions): Promise<any> {
    try {
      const { indexId, prompt, videoId, timeRange } = options;

      const payload: any = {
        index_id: indexId,
        task_type: 'generate',
        input: {
          text: prompt
        }
      };

      // Add clip range if time range is provided
      if (timeRange) {
        payload.input.clip_range = {
          start: timeRange[0],
          end: timeRange[1]
        };
      }

      // Add video ID if provided
      if (videoId) {
        payload.input.video_id = videoId;
      }

      const response = await this.client.post('/generate', payload);
      return response.data;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  /**
   * Detect products in a video
   *
   * @param indexId - ID of the index
   * @param videoId - ID of the video
   * @returns Promise with detected products
   */
  async detectProducts(indexId: string, videoId: string): Promise<ProductDetection[]> {
    try {
      // Product categories we want to detect
      const productCategories = [
        "clothing", "apparel", "fashion", "accessories",
        "electronics", "gadgets", "devices",
        "furniture", "home decor", "kitchenware",
        "beauty products", "cosmetics", "skincare",
        "sports equipment", "fitness gear",
        "jewelry", "watches"
      ];

      // Generate search queries for each product category
      const searchPromises = productCategories.map(category => {
        const query = `Show me all ${category} items visible in this scene`;

        return this.search({
          query,
          indexId,
          videoId,
          searchOptions: ['visual', 'conversation', 'text_in_video', 'logo'],
          groupBy: 'clip',
          pageLimit: 5,
          threshold: 'medium',
          confidenceLevel: 0.7
        });
      });

      // Wait for all searches to complete
      const searchResults = await Promise.all(searchPromises);

      // Process results to extract product information
      const detectedProducts = this.processProductSearchResults(searchResults, videoId, productCategories);

      // Enrich products with context
      const enrichedProducts = await this.enrichProductsWithContext(detectedProducts, indexId);

      return enrichedProducts;
    } catch (error) {
      console.error('Error detecting products:', error);
      throw error;
    }
  }

  /**
   * Process search results to extract product information
   *
   * @private
   */
  private processProductSearchResults(
    searchResults: any[],
    videoId: string,
    categories: string[]
  ): ProductDetection[] {
    const products: ProductDetection[] = [];
    const processedClips = new Set<string>();

    searchResults.forEach((result, index) => {
      const category = categories[index];
      const data = result.data || [];

      data.forEach((item: any) => {
        // Skip if confidence is too low
        if (!item.confidence || item.confidence < 0.6) return;

        const clips = item.clips || [];

        clips.forEach((clip: any) => {
          // Create a unique ID for this clip to avoid duplicates
          const clipId = `${clip.start}-${clip.end}`;

          // Skip if we've already processed this clip
          if (processedClips.has(clipId)) return;
          processedClips.add(clipId);

          // Extract text from metadata
          const clipText = clip.metadata?.text || "";

          // Generate product name and description
          const productName = this.generateProductName(clipText, category);

          if (productName) {
            products.push({
              id: `${videoId}-${clipId}`,
              name: productName,
              description: this.generateProductDescription(clipText, category),
              category: category,
              timeAppearance: [clip.start, clip.end],
              confidence: item.confidence,
              position: this.estimatePosition(clip.metadata?.visual_detections || [])
            });
          }
        });
      });
    });

    return products;
  }

  /**
   * Generate a product name from detected text and category
   *
   * @private
   */
  private generateProductName(text: string, category: string): string {
    if (!text) return `${this.capitalizeFirstLetter(category)} Item`;

    // Extract noun phrases that might be product names
    const words = text.split(' ');

    // Look for patterns like "X Y" where X is adjective and Y is noun
    // This is a simplified approach - real system would use NLP
    if (words.length >= 2) {
      return `${words[0]} ${words[1]}`;
    } else if (words.length === 1) {
      return words[0];
    }

    return `${this.capitalizeFirstLetter(category)} Item`;
  }

  /**
   * Generate a product description from detected text and category
   *
   * @private
   */
  private generateProductDescription(text: string, category: string): string {
    if (!text) return `A ${category} item detected in the video.`;

    // Simple description generation
    return `${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;
  }

  /**
   * Estimate product position from visual detections
   *
   * @private
   */
  private estimatePosition(visualDetections: any[]): { x: number, y: number } {
    if (!visualDetections || !Array.isArray(visualDetections) || visualDetections.length === 0) {
      // Default position if no detections
      return { x: 50, y: 50 };
    }

    // Find the detection with highest confidence
    const bestDetection = visualDetections.reduce((best, current) => {
      return (current.confidence > best.confidence) ? current : best;
    }, visualDetections[0]);

    // Calculate center position from bounding box
    if (bestDetection.boundingBox) {
      const { x, y, width, height } = bestDetection.boundingBox;
      return {
        x: (x + width / 2) * 100, // Convert to percentage
        y: (y + height / 2) * 100  // Convert to percentage
      };
    }

    return { x: 50, y: 50 };
  }

  /**
   * Enrich products with context using TwelveLabs Generate API
   *
   * @private
   */
  private async enrichProductsWithContext(
    products: ProductDetection[],
    indexId: string
  ): Promise<ProductDetection[]> {
    // For each product, generate context using Generate API
    const enrichedProducts = await Promise.all(products.map(async (product) => {
      try {
        const prompt = `
          Generate a brief product description for the following item seen in a video:
          - Product: ${product.name}
          - Category: ${product.category}

          Focus on how the product is being used in the scene, its appearance, and potential benefits.
          Keep it concise (2-3 sentences) and make it appealing for shoppers.
        `;

        const result = await this.generate({
          indexId,
          prompt,
          timeRange: product.timeAppearance
        });

        // Add the generated context to the product
        if (result && result.output && result.output.text) {
          return {
            ...product,
            aiGeneratedContext: result.output.text
          };
        }

        return product;
      } catch (error) {
        console.error("Error enriching product with context:", error);
        return product;
      }
    }));

    return enrichedProducts;
  }

  /**
   * Find related products based on a product or category
   *
   * @param options - Options for finding related products
   * @returns Promise with related products
   */
  async findRelatedProducts(options: {
    indexId: string;
    productId?: string;
    category?: string;
    productName?: string;
    videoId?: string;
    timeRange?: [number, number];
    limit?: number;
  }): Promise<RelatedProduct[]> {
    try {
      const {
        indexId,
        productId,
        category,
        productName,
        videoId,
        timeRange,
        limit = 4
      } = options;

      // Build search query based on available information
      let queryText = "";

      if (productName) {
        queryText = `Products similar to ${productName}`;
        if (category) {
          queryText += ` in the ${category} category`;
        }
      } else if (category) {
        queryText = `Show me ${category} products`;
      } else {
        queryText = "Show me related products";
      }

      // Additional search parameters
      const searchOptions: TwelveLabsSearchOptions['searchOptions'] = [
        'visual', 'conversation', 'text_in_video'
      ];

      // If we have a specific product, add visual similarity search
      if (productId) {
        searchOptions.push('visual_similarity');
      }

      // Make the search request
      const searchResult = await this.search({
        query: queryText,
        indexId,
        searchOptions,
        groupBy: 'clip',
        pageLimit: limit * 2, // Request more than needed to filter for best results
        threshold: 'medium',
        confidenceLevel: 0.6,
        videoId,
        timeRange
      });

      // Process search results to extract product information
      const relatedProducts = this.processRelatedProductResults(searchResult, limit);

      // Generate additional context for related products
      const productsWithContext = await this.enrichRelatedProductsWithContext(relatedProducts, indexId);

      return productsWithContext;
    } catch (error) {
      console.error('Error finding related products:', error);
      throw error;
    }
  }

  /**
   * Process search results to extract related product information
   *
   * @private
   */
  private processRelatedProductResults(searchData: any, limit: number): RelatedProduct[] {
    const products: RelatedProduct[] = [];
    const processedClips = new Set<string>();

    // Ensure we have valid data
    if (!searchData || !searchData.data || !Array.isArray(searchData.data)) {
      return products;
    }

    // Process each search result
    searchData.data.forEach((result: any) => {
      // Skip if confidence is too low
      if (!result.confidence || result.confidence < 0.5) return;

      const clips = result.clips || [];

      clips.forEach((clip: any) => {
        // Create a unique ID for this clip to avoid duplicates
        const clipId = `${clip.video_id}-${clip.start}-${clip.end}`;

        // Skip if we've already processed this clip
        if (processedClips.has(clipId)) return;
        processedClips.add(clipId);

        // Extract text from metadata
        const clipText = clip.metadata?.text || "";

        // Try to identify product information from the clip
        const productInfo = this.extractProductInfo(clipText);

        if (productInfo.name) {
          products.push({
            id: clipId,
            name: productInfo.name,
            description: productInfo.description,
            price: this.generateRandomPrice(),
            category: productInfo.category || "Unknown",
            // Store clip data for context generation
            clipData: {
              videoId: clip.video_id,
              start: clip.start,
              end: clip.end
            }
          } as any);
        }

        // Stop once we have enough products
        if (products.length >= limit) {
          return;
        }
      });
    });

    // Return the top products sorted by relevance
    return products.slice(0, limit);
  }

  /**
   * Extract product information from clip text
   *
   * @private
   */
  private extractProductInfo(text: string): {
    name: string;
    description: string;
    category?: string;
  } {
    if (!text) return {
      name: "Related Item",
      description: "A related product based on the video context."
    };

    // Try to identify product name (simple heuristic)
    const words = text.split(' ');
    let name = "";
    let category = "";

    // Look for product indicators
    const productIndicators = ["wearing", "using", "with", "has", "features", "shows"];

    for (const indicator of productIndicators) {
      const index = text.toLowerCase().indexOf(indicator);
      if (index >= 0 && index + indicator.length + 1 < text.length) {
        // Extract text after the indicator
        const afterIndicator = text.substring(index + indicator.length + 1);
        const endIndex = afterIndicator.indexOf(".");
        name = endIndex > 0 ?
          afterIndicator.substring(0, endIndex) :
          afterIndicator.split(" ").slice(0, 3).join(" ");
        break;
      }
    }

    // If no name found, use first few words
    if (!name && words.length >= 2) {
      name = words.slice(0, Math.min(3, words.length)).join(" ");
    }

    // Try to identify category
    const categories = [
      "clothing", "apparel", "fashion", "accessories",
      "electronics", "gadgets", "devices",
      "furniture", "home decor", "kitchenware",
      "beauty", "cosmetics", "skincare",
      "sports", "fitness", "jewelry", "watches"
    ];

    for (const cat of categories) {
      if (text.toLowerCase().includes(cat)) {
        category = cat;
        break;
      }
    }

    return {
      name: this.capitalizeFirstLetter(name || "Related Item"),
      description: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
      category: category ? this.capitalizeFirstLetter(category) : undefined
    };
  }

  /**
   * Enrich related products with additional context
   *
   * @private
   */
  private async enrichRelatedProductsWithContext(
    products: any[],
    indexId: string
  ): Promise<RelatedProduct[]> {
    // For each product, generate context using Generate API
    const enrichedProducts = await Promise.all(products.map(async (product) => {
      try {
        // Skip if no clip data
        if (!product.clipData) {
          const { clipData, ...cleanProduct } = product;
          return cleanProduct;
        }

        const prompt = `
          Generate a brief product recommendation for the following item:
          - Product: ${product.name}
          - Category: ${product.category || "Unknown"}

          Explain why this product would be a good recommendation based on the context in the video.
          Keep it concise (1-2 sentences) and focus on why the viewer might be interested in this product.
        `;

        const result = await this.generate({
          indexId,
          prompt,
          videoId: product.clipData.videoId,
          timeRange: [product.clipData.start, product.clipData.end]
        });

        // Remove clip data and add the generated context
        const { clipData, ...cleanProduct } = product;

        if (result && result.output && result.output.text) {
          return {
            ...cleanProduct,
            whyRecommended: result.output.text
          };
        }

        return cleanProduct;
      } catch (error) {
        console.error("Error enriching related product with context:", error);
        const { clipData, ...cleanProduct } = product;
        return cleanProduct;
      }
    }));

    return enrichedProducts;
  }

  /**
   * Generate a random price for demo purposes
   *
   * @private
   */
  private generateRandomPrice(): number {
    // Generate a random price between $19.99 and $199.99
    return Math.round((Math.random() * 180 + 20) * 100) / 100;
  }

  /**
   * Helper function to capitalize the first letter of a string
   *
   * @private
   */
  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

/**
 * Create a TwelveLabs API client instance with the provided API key
 *
 * @param apiKey - TwelveLabs API key
 * @param baseUrl - Optional base URL for the API
 * @returns TwelveLabs API client instance
 */
export function createTwelveLabsClient(
  apiKey: string,
  baseUrl?: string
): TwelveLabsClient {
  return new TwelveLabsClient(apiKey, baseUrl);
}
