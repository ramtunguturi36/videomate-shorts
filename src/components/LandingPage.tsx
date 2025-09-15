import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Users, 
  Shield, 
  CreditCard, 
  FolderOpen, 
  Smartphone, 
  Zap,
  Star,
  CheckCircle,
  ArrowRight,
  Video,
  Image,
  ShoppingCart
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Video,
      title: "TikTok-like Video Feed",
      description: "Smooth short-form video viewing with auto-play and infinite scroll"
    },
    {
      icon: FolderOpen,
      title: "Organized Content",
      description: "Browse videos through nested folder structure for easy navigation"
    },
    {
      icon: CreditCard,
      title: "Secure Payments",
      description: "Purchase premium content with integrated Razorpay payment system"
    },
    {
      icon: Shield,
      title: "Secure Authentication",
      description: "JWT-based authentication with Google OAuth and role-based access"
    },
    {
      icon: Smartphone,
      title: "Mobile Responsive",
      description: "Optimized for all devices with modern, intuitive interface"
    },
    {
      icon: Zap,
      title: "Fast Performance",
      description: "Cloudflare R2 CDN for lightning-fast video streaming"
    }
  ];

  const stats = [
    { label: "Active Users", value: "10K+" },
    { label: "Videos Available", value: "5K+" },
    { label: "Premium Content", value: "2K+" },
    { label: "Satisfaction Rate", value: "98%" }
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: [
        "Access to free videos",
        "Basic video player",
        "Standard quality",
        "Limited downloads"
      ],
      buttonText: "Get Started",
      buttonStyle: "btn-outline"
    },
    {
      name: "Premium",
      price: "$29",
      period: "per month",
      features: [
        "Unlimited video access",
        "HD quality streaming",
        "Download videos",
        "Priority support",
        "Ad-free experience"
      ],
      buttonText: "Start Premium",
      buttonStyle: "btn-primary",
      popular: true
    },
    {
      name: "Pro",
      price: "$299",
      period: "per year",
      features: [
        "Everything in Premium",
        "4K quality streaming",
        "Bulk downloads",
        "Advanced analytics",
        "Custom playlists",
        "Early access to new content"
      ],
      buttonText: "Go Pro",
      buttonStyle: "btn-primary"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">VideoFeed</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Experience the Future of
              <span className="text-primary-600"> Video Streaming</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Discover, watch, and purchase premium video content with our TikTok-like interface. 
              Organized folders, secure payments, and seamless streaming experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="btn-primary text-lg px-8 py-3 flex items-center justify-center space-x-2"
              >
                <span>Start Watching</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn-outline text-lg px-8 py-3"
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose VideoFeed?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built with modern technology and user experience in mind
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 text-center hover:shadow-lg transition-shadow duration-300">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in just a few simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Sign Up & Login
              </h3>
              <p className="text-gray-600">
                Create your account or login with Google OAuth for quick access
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Browse & Watch
              </h3>
              <p className="text-gray-600">
                Explore organized folders and enjoy TikTok-like video streaming
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Purchase Premium
              </h3>
              <p className="text-gray-600">
                Unlock premium content with secure Razorpay payments
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600">
              Flexible pricing options for every user
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div key={index} className={`card p-8 relative ${plan.popular ? 'ring-2 ring-primary-500' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-1">/{plan.period}</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => navigate('/login')}
                  className={`w-full ${plan.buttonStyle} py-3`}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already enjoying premium video content
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-primary-600 hover:bg-gray-100 font-medium py-3 px-8 rounded-lg transition-colors duration-200 text-lg"
          >
            Start Your Journey
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">VideoFeed</span>
              </div>
              <p className="text-gray-400">
                The future of video streaming with premium content and secure payments.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Video Streaming</li>
                <li>Premium Content</li>
                <li>Secure Payments</li>
                <li>Mobile App</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Twitter</li>
                <li>Facebook</li>
                <li>Instagram</li>
                <li>LinkedIn</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 VideoFeed. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
