import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { VideoFeedItem } from '../types/feed';

interface CartItem {
  videoId: string;
  video: VideoFeedItem;
  addedAt: Date;
}

interface CartContextType {
  items: CartItem[];
  addItem: (video: VideoFeedItem) => void;
  removeItem: (videoId: string) => void;
  clearCart: () => void;
  isInCart: (videoId: string) => boolean;
  getTotalPrice: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Convert addedAt strings back to Date objects
        const cartWithDates = parsedCart.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        }));
        setItems(cartWithDates);
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
        localStorage.removeItem('cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (video: VideoFeedItem) => {
    setItems(prev => {
      // Check if item already exists
      if (prev.some(item => item.videoId === video.id)) {
        return prev;
      }
      
      const newItem: CartItem = {
        videoId: video.id,
        video,
        addedAt: new Date()
      };
      
      return [...prev, newItem];
    });
  };

  const removeItem = (videoId: string) => {
    setItems(prev => prev.filter(item => item.videoId !== videoId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const isInCart = (videoId: string) => {
    return items.some(item => item.videoId === videoId);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      const price = item.video.associatedImage?.price || 0;
      return total + price;
    }, 0);
  };

  const getItemCount = () => {
    return items.length;
  };

  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    clearCart,
    isInCart,
    getTotalPrice,
    getItemCount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
