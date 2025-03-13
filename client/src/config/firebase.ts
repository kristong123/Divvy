// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "divvy-14457.firebaseapp.com",
  databaseURL: "https://divvy-14457-default-rtdb.firebaseio.com",
  projectId: "divvy-14457",
  messagingSenderId: "229466702760",
  appId: "1:229466702760:web:5df0bd9bdbb8ff66fe539d",
  measurementId: "G-3ZXDZ5PTSK"
};

// Initialize Firebase
initializeApp(firebaseConfig);

// Helper function to preload images
export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      console.error(`Failed to preload image: ${src}`, e);
      reject(new Error(`Failed to load image: ${src}`));
    };
    
    img.src = src;
  });
};

// Add a global error handler for image loading issues
document.addEventListener('DOMContentLoaded', () => {
  // This helps debug image loading issues
  window.addEventListener('error', (e) => {
    if (e.target && (e.target as HTMLElement).tagName === 'IMG') {
      const imgElement = e.target as HTMLImageElement;
      console.error('Image loading error:', imgElement.src);
      
      // Try to recover by using a placeholder
      if (!imgElement.src.includes('placehold.co')) {
        console.log('Replacing failed image with placeholder');
        imgElement.src = 'https://placehold.co/150x150';
      }
    }
  }, true);
  
  // Add CORS headers to all image requests
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    // Only modify image requests
    if (typeof input === 'string' && 
        (input.includes('.jpg') || 
         input.includes('.png') || 
         input.includes('.gif') ||
         input.includes('images.weserv.nl'))) {
      
      // Create new init object with CORS headers
      const newInit = {
        ...init,
        mode: 'cors' as RequestMode,
        credentials: 'omit' as RequestCredentials,
        headers: {
          ...(init?.headers || {}),
          'Cache-Control': 'no-cache',
        }
      };
      
      return originalFetch(input, newInit);
    }
    
    // For all other requests, use original fetch
    return originalFetch(input, init);
  };
});