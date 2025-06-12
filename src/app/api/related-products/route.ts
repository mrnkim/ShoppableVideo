import { NextResponse } from "next/server";
import axios from "axios";

// Set maximum duration for this API route
export const maxDuration = 60;

// TwelveLabs API configuration
const TWELVELABS_API_KEY = process.env.TWELVELABS_API_KEY;
const TWELVELABS_API_URL = process.env.TWELVELABS_API_URL || "https://api.twelvelabs.io/v1.2";

/**
 * Find related products based on a product or category
 * 
 * Expected request body:
 * {
 *   productId?: string,       // Optional: ID of the product to find related items for
 *   category?: string,        // Optional: Category to find related items for
 *   videoId: string,          // TwelveLabs video ID
 *   indexId: string,          // TwelveLabs index ID
 *   timeRange?: [number, number], // Optional: Time range to search within
 *   productName?: string,     // Optional: Name of the product to find related items for
 *   limit?: number            // Optional: Maximum number of related products to return
 * }
 */
export async function POST(req: Request) {
  try {
    // Parse request body
    const body = await req.json();
    const { 
      productId, 
      category, 
      videoId, 
      indexId, 
      timeRange, 
      productName,
      limit = 4 
    } = body;

    // Validate required parameters
    if (!indexId) {
      return NextResponse.json(
        { error: "indexId is required" },
        { status: 400 }
      );
    }

    // Need at least one of these to find related products
    if (!productId && !category && !productName) {
      return NextResponse.json(
        { error: "At least one of productId, category, or productName is required" },
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
    const searchOptions = ["visual", "conversation", "text_in_video"];
    
    // If we have a specific product, add visual similarity search
    if (productId) {
      searchOptions.push("visual_similarity");
    }

    // Make the search request to TwelveLabs API
    const searchResponse = await axios.post(
      `${TWELVELABS_API_URL}/search`,
      {
        query_text: queryText,
        index_id: indexId,
        search_options: searchOptions,
        group_by: "clip",
        page_limit: limit * 2, // Request more than needed to filter for best results
        threshold: "medium",
        adjust_confidence_level: 0.6,
        video_id: videoId || undefined,
        time_range: timeRange || undefined
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": TWELVELABS_API_KEY
        }
      }
    );

    // Process search results to extract product information
    const relatedProducts = processSearchResults(searchResponse.data, limit);

    // Generate additional context for related products
    const productsWithContext = await enrichRelatedProducts(relatedProducts, indexId);

    return NextResponse.json({
      success: true,
      relatedProducts: productsWithContext
    });
  } catch (error) {
    console.error("Related products search error:", error);
    return NextResponse.json(
      { 
        error: "Failed to find related products",
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

/**
 * Process search results to extract related product information
 */
function processSearchResults(searchData: any, limit: number) {
  const products: any[] = [];
  const processedClips = new Set();

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
      const productInfo = extractProductInfo(clipText);
      
      if (productInfo.name) {
        products.push({
          id: clipId,
          name: productInfo.name,
          description: productInfo.description || "Related product based on video context",
          price: generateRandomPrice(),
          category: productInfo.category || "Unknown",
          timeAppearance: [clip.start, clip.end],
          confidence: result.confidence,
          // Store clip data for further processing
          clipData: {
            videoId: clip.video_id,
            start: clip.start,
            end: clip.end
          }
        });
      }

      // Stop once we have enough products
      if (products.length >= limit) {
        return;
      }
    });
  });

  // Return the top products sorted by confidence
  return products
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

/**
 * Extract product information from clip text
 */
function extractProductInfo(text: string) {
  // This is a simplified implementation - in a real app, this would use NLP
  // to extract product details from the text more accurately
  
  if (!text) return { name: "Related Item" };
  
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
    name: capitalizeFirstLetter(name || "Related Item"),
    description: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
    category: capitalizeFirstLetter(category || "")
  };
}

/**
 * Generate a random price for demo purposes
 */
function generateRandomPrice(): number {
  // Generate a random price between $19.99 and $199.99
  return Math.round((Math.random() * 180 + 20) * 100) / 100;
}

/**
 * Enrich related products with additional context
 */
async function enrichRelatedProducts(products: any[], indexId: string): Promise<any[]> {
  // For each product, generate context using TwelveLabs Generate API
  const enrichedProducts = await Promise.all(products.map(async (product) => {
    try {
      // Skip if no API key or no clip data
      if (!TWELVELABS_API_KEY || !product.clipData) {
        return {
          ...product,
          clipData: undefined // Remove clip data from response
        };
      }
      
      const prompt = `
        Generate a brief product recommendation for the following item seen in a video:
        - Product: ${product.name}
        - Category: ${product.category || "Unknown"}
        
        Explain why this product would be a good recommendation based on the context in the video.
        Keep it concise (1-2 sentences) and focus on why the viewer might be interested in this product.
      `;
      
      const response = await axios.post(
        `${TWELVELABS_API_URL}/generate`,
        {
          index_id: indexId,
          task_type: "generate",
          input: {
            text: prompt,
            clip_range: {
              start: product.clipData.start,
              end: product.clipData.end
            },
            video_id: product.clipData.videoId
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
          whyRecommended: response.data.output.text,
          clipData: undefined // Remove clip data from response
        };
      }
      
      return {
        ...product,
        clipData: undefined // Remove clip data from response
      };
    } catch (error) {
      console.error("Error enriching related product with context:", error);
      return {
        ...product,
        clipData: undefined // Remove clip data from response
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
