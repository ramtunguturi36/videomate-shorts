import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Mail, 
  Phone, 
  Building, 
  User,
  HelpCircle,
  Bug,
  Lightbulb,
  Briefcase,
  Heart,
  Clock,
  CheckCircle
} from 'lucide-react';
import { contactAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isAuthenticated?: boolean;
  userInfo?: {
    name: string;
    email: string;
  };
}

const ContactForm: React.FC<ContactFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isAuthenticated = false,
  userInfo
}) => {
  const [formData, setFormData] = useState({
    name: userInfo?.name || '',
    email: userInfo?.email || '',
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium',
    phone: '',
    company: '',
    preferredContactMethod: 'email'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'general', label: 'General Inquiry', icon: MessageSquare, color: 'text-blue-600' },
    { value: 'support', label: 'Support Request', icon: HelpCircle, color: 'text-green-600' },
    { value: 'feedback', label: 'Feedback', icon: Heart, color: 'text-pink-600' },
    { value: 'bug_report', label: 'Bug Report', icon: Bug, color: 'text-red-600' },
    { value: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-600' },
    { value: 'business', label: 'Business Inquiry', icon: Briefcase, color: 'text-purple-600' },
    { value: 'other', label: 'Other', icon: MessageSquare, color: 'text-gray-600' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-gray-600' },
    { value: 'medium', label: 'Medium', color: 'text-blue-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  const contactMethods = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'phone', label: 'Phone', icon: Phone },
    { value: 'both', label: 'Both', icon: MessageSquare }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        category: formData.category,
        priority: formData.priority,
        phone: formData.phone.trim() || null,
        company: formData.company.trim() || null,
        preferredContactMethod: formData.preferredContactMethod
      };

      const response = isAuthenticated 
        ? await contactAPI.submitAuthenticated(submitData)
        : await contactAPI.submit(submitData);

      toast.success('Message sent successfully! We\'ll get back to you within 24-48 hours.');
      
      // Reset form
      setFormData({
        name: userInfo?.name || '',
        email: userInfo?.email || '',
        subject: '',
        message: '',
        category: 'general',
        priority: 'medium',
        phone: '',
        company: '',
        preferredContactMethod: 'email'
      });

      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      toast.error(error.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Contact Us</h2>
              <p className="text-sm text-gray-600">
                {isAuthenticated ? 'Send us a message' : 'We\'d love to hear from you'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Optional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="Your company name"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Brief description of your inquiry"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Category *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <label
                    key={category.value}
                    className={`relative flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.category === category.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={category.value}
                      checked={formData.category === category.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <IconComponent className={`w-5 h-5 ${category.color}`} />
                    <span className="text-sm font-medium text-gray-900">
                      {category.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Priority
            </label>
            <div className="flex space-x-3">
              {priorities.map((priority) => (
                <label
                  key={priority.value}
                  className={`relative flex items-center space-x-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
                    formData.priority === priority.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={priority.value}
                    checked={formData.priority === priority.value}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span className={`text-sm font-medium ${priority.color}`}>
                    {priority.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={6}
              placeholder="Please provide detailed information about your inquiry..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.message.length}/2000 characters
            </p>
          </div>

          {/* Preferred Contact Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Preferred Contact Method
            </label>
            <div className="flex space-x-3">
              {contactMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <label
                    key={method.value}
                    className={`relative flex items-center space-x-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
                      formData.preferredContactMethod === method.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="preferredContactMethod"
                      value={method.value}
                      checked={formData.preferredContactMethod === method.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <IconComponent className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {method.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Response Time</h4>
                <p className="text-sm text-gray-600 mt-1">
                  We typically respond to all inquiries within 24-48 hours. For urgent matters, please mark as "Urgent" priority.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;
