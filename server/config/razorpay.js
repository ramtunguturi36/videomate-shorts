import Razorpay from 'razorpay';
import crypto from 'crypto';

// Lazy initialization - only initialize when first needed
let razorpay = null;
let initialized = false;

// Function to initialize Razorpay
const initializeRazorpay = () => {
  if (initialized) return razorpay;
  
  // Check if Razorpay credentials are available
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Debug logging
  console.log('Razorpay Environment Check:');
  console.log('RAZORPAY_KEY_ID (raw):', keyId);
  console.log('RAZORPAY_KEY_SECRET (raw):', keySecret);
  console.log('RAZORPAY_WEBHOOK_SECRET:', webhookSecret ? webhookSecret : 'NOT SET');

  if (!keyId || !keySecret) {
    console.warn('Warning: Razorpay credentials not found. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file');
    console.warn('Razorpay functionality will be disabled until credentials are provided.');
    initialized = true;
    return null;
  }

  // Initialize Razorpay instance
  try {
    console.log('Initializing Razorpay...');
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    console.log('✅ Razorpay initialized successfully');
    initialized = true;
    return razorpay;
  } catch (error) {
    console.error('❌ Error initializing Razorpay:', error);
    initialized = true;
    return null;
  }
};

// Create order
export const createOrder = async (amount, currency = 'INR', receipt = null) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: receipt || `rec_${Date.now().toString().slice(-8)}`,
      payment_capture: 1, // Auto capture payment
    };

    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

// Verify payment
export const verifyPayment = async (orderId, paymentId, signature) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error('Razorpay key secret is not available. Please check your environment variables.');
  }
  
  try {
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === signature) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

// Verify webhook signature
export const verifyWebhookSignature = (body, signature) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Webhook secret is not configured');
  }
  
  try {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(body);
    const generatedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(generatedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

// Get payment details
export const getPaymentDetails = async (paymentId) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw error;
  }
};

// Create subscription
export const createSubscription = async (planId, customerId, options = {}) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const subscriptionOptions = {
      plan_id: planId,
      customer_id: customerId,
      total_count: options.totalCount || 12, // Default to 12 months for yearly
      quantity: options.quantity || 1,
      start_at: options.startAt || Math.floor(Date.now() / 1000),
      expire_by: options.expireBy,
      addons: options.addons || [],
      notes: options.notes || {}
    };

    const subscription = await razorpayInstance.subscriptions.create(subscriptionOptions);
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

// Cancel subscription
export const cancelSubscription = async (subscriptionId, cancelAtCycleEnd = false) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const options = {
      cancel_at_cycle_end: cancelAtCycleEnd
    };
    
    const subscription = await razorpayInstance.subscriptions.cancel(subscriptionId, options);
    return subscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

// Get subscription details
export const getSubscriptionDetails = async (subscriptionId) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const subscription = await razorpayInstance.subscriptions.fetch(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    throw error;
  }
};

// Create customer
export const createCustomer = async (customerData) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const customer = await razorpayInstance.customers.create(customerData);
    return customer;
  } catch (error) {
    // If customer already exists, try to find and return existing customer
    if (error.statusCode === 400 && error.error?.description?.includes('Customer already exists')) {
      console.log('Customer already exists, attempting to find existing customer...');
      try {
        // Try to find existing customer by email
        const customers = await razorpayInstance.customers.all({
          email: customerData.email
        });
        
        if (customers.items && customers.items.length > 0) {
          console.log('Found existing customer:', customers.items[0].id);
          return customers.items[0];
        }
      } catch (findError) {
        console.error('Error finding existing customer:', findError);
      }
    }
    
    console.error('Error creating customer:', error);
    throw error;
  }
};

// Create plan
export const createPlan = async (planData) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const plan = await razorpayInstance.plans.create(planData);
    return plan;
  } catch (error) {
    console.error('Error creating plan:', error);
    throw error;
  }
};

// Update plan
export const updatePlan = async (planId, planData) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const plan = await razorpayInstance.plans.update(planId, planData);
    return plan;
  } catch (error) {
    console.error('Error updating plan:', error);
    throw error;
  }
};

// Delete plan
export const deletePlan = async (planId) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const plan = await razorpayInstance.plans.delete(planId);
    return plan;
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw error;
  }
};

// Get plan details
export const getPlanDetails = async (planId) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const plan = await razorpayInstance.plans.fetch(planId);
    return plan;
  } catch (error) {
    console.error('Error fetching plan details:', error);
    throw error;
  }
};

// Get all plans
export const getAllPlans = async (options = {}) => {
  const razorpayInstance = initializeRazorpay();
  if (!razorpayInstance) {
    throw new Error('Razorpay is not initialized. Please check your environment variables.');
  }
  
  try {
    const plans = await razorpayInstance.plans.all(options);
    return plans;
  } catch (error) {
    console.error('Error fetching plans:', error);
    throw error;
  }
};

export default initializeRazorpay;
