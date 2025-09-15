export interface VideoFeedItem {
  id: string;
  title: string;
  fileType: 'video';
  r2Url: string;
  thumbnailUrl?: string;
  metadata: {
    duration?: number;
    dimensions?: {
      width: number;
      height: number;
    };
    tags: string[];
    description: string;
    price: number;
    isPublic: boolean;
    downloadCount: number;
    viewCount: number;
  };
  uploadInfo: {
    uploadedBy: {
      id: string;
      name: string;
      email: string;
    };
    uploadDate: Date;
    lastModified: Date;
  };
  associatedImage?: {
    id: string;
    title: string;
    r2Url: string;
    price: number;
    hasPurchased: boolean;
  };
}

export interface PurchaseOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

export interface Purchase {
  id: string;
  user: string;
  file: string;
  amount: number;
  currency: string;
  paymentMethod: 'razorpay' | 'subscription' | 'free';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  purchaseDate: Date;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    platform?: string;
  };
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
