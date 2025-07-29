import { NextResponse } from "next/server";
import axios from "axios";

// Set maximum duration for this API route (extended for video processing)
export const maxDuration = 120;

// TwelveLabs API configuration
const TWELVELABS_API_KEY = process.env.TWELVELABS_API_KEY;
const TWELVELABS_API_URL = process.env.TWELVELABS_API_URL || "https://api.twelvelabs.io/v1.3";

// Product categories we want to detect
const PRODUCT_CATEGORIES = [
  "clothing", "apparel", "fashion", "accessories", 
  "electronics", "gadgets", "devices",
  "furniture", "home decor", "kitchenware",
  "beauty products", "cosmetics", "skincare",
  "sports equipment", "fitness gear",
  "jewelry", "watches"
];

// Helper function to generate search queries for products
function generateProductQueries() {
  return PRODUCT_CATEGORIES.map(category => ({
    category,
    query: `Show me all ${category} items visible in this scene`
  }));
}

/**
 * Detect products in a video using TwelveLabs API
 * 
 * Expected request body:
 * {
 *   videoId: string, // TwelveLabs video ID
 *   indexId: string  // TwelveLabs index ID
 * }
 */
export async function POST(req: Request) {
  try {
    // Parse request body
    const body = await req.json();
    const { videoId, indexId } = body;

    // Validate required parameters
    if (!videoId || !indexId) {
      return NextResponse.json(
        { error: "videoId and indexId are required" },
        { status: 400 }
      );
    }

    // Validate API key
    if (!TWELVELABS_API_KEY) {
      return NextResponse.json(
        { error: "TwelveLabs API key is not configured" },
        { status: 500 }
      );
    }

    // Generate product detection queries
    const productQueries = generateProductQueries();
    
    // Execute parallel searches for different product categories
    const searchPromises = productQueries.map(async ({ category, query }) => {
      try {
        const response = await axios.post(
          `${TWELVELABS_API_URL}/search`,
          {
            query_text: query,
            index_id: indexId,
            search_options: ["visual", "conversation", "text_in_video", "logo"],
            group_by: "clip",
            page_limit: 10,
            threshold: "medium",
            adjust_confidence_level: 0.7
          },
          {
            headers: {
              "Content-Type": "application/json",
              "x-api-key": TWELVELABS_API_KEY
            }
          }
        );

        // Process and return search results with category information
        return {
          category,
          results: response.data.data || []
        };
      } catch (error) {
        console.error(`Error searching for ${category}:`, error);
        return {
          category,
          results: [],
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    });

    // Wait for all search queries to complete
    const searchResults = await Promise.all(searchPromises);

    // Process results to extract product information
    const detectedProducts = processSearchResults(searchResults, videoId);

    // Generate additional context for each product using TwelveLabs Generate API
    const productsWithContext = await enrichProductsWithContext(detectedProducts, indexId);

    return NextResponse.json({
      success: true,
      products: productsWithContext
    });
  } catch (error) {
    console.error("Product detection error:", error);
    return NextResponse.json(
      { 
        error: "Failed to detect products",
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

/**
 * Process search results to extract product information
 */
function processSearchResults(searchResults: any[], videoId: string) {
  const products: any[] = [];
  const processedClips = new Set();

  searchResults.forEach(({ category, results }) => {
    if (!results || !Array.isArray(results)) return;

    results.forEach(result => {
      // Skip if confidence is too low
      if (!result.confidence || result.confidence < 0.6) return;

      const clips = result.clips || [];
      
      clips.forEach((clip: any) => {
        // Create a unique ID for this clip to avoid duplicates
        const clipId = `${clip.start}-${clip.end}`;
        
        // Skip if we've already processed this clip
        if (processedClips.has(clipId)) return;
        processedClips.add(clipId);

        // Extract product information
        const productName = generateProductName(clip.metadata?.text || "", category);
        
        if (productName) {
          products.push({
            id: `${videoId}-${clipId}`,
            name: productName,
            description: generateProductDescription(clip.metadata?.text || "", category),
            category: category,
            timeAppearance: [clip.start, clip.end],
            confidence: result.confidence,
            // Estimate position based on bounding boxes if available
            position: estimatePosition(clip.metadata?.visual_detections || []),
            // Store raw data for further processing
            rawData: {
              clip: clip,
              metadata: clip.metadata || {}
            }
          });
        }
      });
    });
  });

  return products;
}

/**
 * Generate a product name from detected text and category
 */
function generateProductName(text: string, category: string): string {
  // Simple heuristic: extract likely product name from text
  // In a real application, this would use more sophisticated NLP
  
  if (!text) return `${capitalizeFirstLetter(category)} Item`;
  
  // Extract noun phrases that might be product names
  const words = text.split(' ');
  
  // Look for patterns like "X Y" where X is adjective and Y is noun
  // This is a very simple approach - real system would use NLP
  if (words.length >= 2) {
    return `${words[0]} ${words[1]}`;
  } else if (words.length === 1) {
    return words[0];
  }
  
  return `${capitalizeFirstLetter(category)} Item`;
}

/**
 * Generate a product description from detected text and category
 */
function generateProductDescription(text: string, category: string): string {
  if (!text) return `A ${category} item detected in the video.`;
  
  // Simple description generation
  return `${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;
}

/**
 * Estimate product position from visual detections
 */
function estimatePosition(visualDetections: any[]): { x: number, y: number } {
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
 */
async function enrichProductsWithContext(products: any[], indexId: string): Promise<any[]> {
  // For each product, generate context using TwelveLabs Generate API
  const enrichedProducts = await Promise.all(products.map(async (product) => {
    try {
      // Skip if no API key
      if (!TWELVELABS_API_KEY) return product;
      
      const prompt = `
        Generate a brief product description for the following item seen in a video:
        - Product: ${product.name}
        - Category: ${product.category}
        - Context from video: ${product.rawData?.metadata?.text || "Not available"}
        
        Focus on how the product is being used in the scene, its appearance, and potential benefits.
        Keep it concise (2-3 sentences) and make it appealing for shoppers.
      `;
      
      const response = await axios.post(
        `${TWELVELABS_API_URL}/generate`,
        {
          index_id: indexId,
          task_type: "generate",
          input: {
            text: prompt,
            clip_range: {
              start: product.timeAppearance[0],
              end: product.timeAppearance[1]
            }
          }
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": TWELVELABS_API_KEY
          }
        }
      );
      
      // Add the generated context to the product
      if (response.data && response.data.output && response.data.output.text) {
        return {
          ...product,
          aiGeneratedContext: response.data.output.text,
          // Remove raw data to keep response size manageable
          rawData: undefined
        };
      }
      
      return {
        ...product,
        // Remove raw data to keep response size manageable
        rawData: undefined
      };
    } catch (error) {
      console.error("Error enriching product with context:", error);
      return {
        ...product,
        // Remove raw data to keep response size manageable
        rawData: undefined
      };
    }
  }));
  
  return enrichedProducts;
}

/**
 * Helper function to capitalize the first letter of a string
 */
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
