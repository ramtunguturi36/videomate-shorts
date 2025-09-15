import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CreditCard, 
  Bug, 
  User, 
  Settings, 
  FileText, 
  HelpCircle,
  Send,
  X,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { issuesAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface IssueReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  transactionId?: string;
  purchaseId?: string;
}

const IssueReportForm: React.FC<IssueReportFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transactionId,
  purchaseId
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relatedTransaction, setRelatedTransaction] = useState<any>(null);
  const [relatedPurchase, setRelatedPurchase] = useState<any>(null);

  // Load related transaction/purchase data if provided
  useEffect(() => {
    const loadRelatedData = async () => {
      if (transactionId) {
        try {
          // You would fetch transaction details here
          setRelatedTransaction({ id: transactionId, amount: 100, status: 'completed' });
        } catch (error) {
          console.error('Error loading transaction:', error);
        }
      }
      
      if (purchaseId) {
        try {
          // You would fetch purchase details here
          setRelatedPurchase({ id: purchaseId, amount: 100, status: 'completed' });
        } catch (error) {
          console.error('Error loading purchase:', error);
        }
      }
    };

    if (isOpen) {
      loadRelatedData();
    }
  }, [isOpen, transactionId, purchaseId]);

  const categories = [
    { value: 'payment', label: 'Payment Issue', icon: CreditCard, color: 'text-green-600' },
    { value: 'technical', label: 'Technical Problem', icon: Bug, color: 'text-red-600' },
    { value: 'account', label: 'Account Issue', icon: User, color: 'text-blue-600' },
    { value: 'content', label: 'Content Problem', icon: FileText, color: 'text-purple-600' },
    { value: 'billing', label: 'Billing Question', icon: DollarSign, color: 'text-yellow-600' },
    { value: 'other', label: 'Other', icon: HelpCircle, color: 'text-gray-600' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-gray-600' },
    { value: 'medium', label: 'Medium', color: 'text-blue-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
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
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await issuesAPI.createIssue({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        transactionId: transactionId || null,
        purchaseId: purchaseId || null
      });

      toast.success('Issue reported successfully! We\'ll get back to you soon.');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'other',
        priority: 'medium'
      });

      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error creating issue:', error);
      toast.error(error.response?.data?.message || 'Failed to report issue. Please try again.');
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Report an Issue</h2>
              <p className="text-sm text-gray-600">We'll help you resolve this quickly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Related Information */}
        {(relatedTransaction || relatedPurchase) && (
          <div className="p-6 bg-blue-50 border-b border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Related Information</h3>
            <div className="space-y-2">
              {relatedTransaction && (
                <div className="flex items-center space-x-2 text-sm text-blue-800">
                  <CreditCard className="w-4 h-4" />
                  <span>Transaction ID: {relatedTransaction.id}</span>
                  <span className="text-blue-600">•</span>
                  <span>Amount: ₹{relatedTransaction.amount}</span>
                </div>
              )}
              {relatedPurchase && (
                <div className="flex items-center space-x-2 text-sm text-blue-800">
                  <CheckCircle className="w-4 h-4" />
                  <span>Purchase ID: {relatedPurchase.id}</span>
                  <span className="text-blue-600">•</span>
                  <span>Status: {relatedPurchase.status}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Issue Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Brief description of the issue"
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

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={6}
              placeholder="Please provide detailed information about the issue. Include steps to reproduce if applicable."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/2000 characters
            </p>
          </div>

          {/* Help Text */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Response Time</h4>
                <p className="text-sm text-gray-600 mt-1">
                  We typically respond to issues within 24-48 hours. Urgent issues are prioritized and may receive faster responses.
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
              disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Issue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueReportForm;
