export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  subscriptionInfo: {
    isActive: boolean;
    plan: 'free' | 'basic' | 'premium';
    startDate?: Date;
    endDate?: Date;
  };
  purchaseHistory: Purchase[];
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  permissions: {
    canManageUsers: boolean;
    canManageContent: boolean;
    canViewAnalytics: boolean;
    canManagePayments: boolean;
    canAccessReports: boolean;
  };
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  productId: string;
  productName: string;
  amount: number;
  purchaseDate: Date;
  status: 'pending' | 'completed' | 'failed';
}

export interface AuthContextType {
  user: User | Admin | null;
  userType: 'user' | 'admin' | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

export interface LoginResponse {
  message: string;
  token: string;
  user?: User;
  admin?: Admin;
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: User;
}
