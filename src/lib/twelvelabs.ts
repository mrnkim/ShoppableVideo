/**
 * TwelveLabs API types for the Shoppable Video application
 */

export interface ProductDetection {
  timeline: [number, number];
  brand: string;
  product_name: string;
  location: number[];
  price: string;
  description: string;
}


