/**
 * TypeScript declarations for Flutterwave Inline Checkout
 */

interface FlutterwaveConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: {
    email: string;
    name: string;
    phone_number?: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
  callback: (response: FlutterwaveCallbackResponse) => void;
  onclose: () => void;
}

interface FlutterwaveCallbackResponse {
  status: string;
  transaction_id: string;
  tx_ref: string;
  flw_ref?: string;
  [key: string]: any;
}

interface Window {
  FlutterwaveCheckout: (config: FlutterwaveConfig) => void;
}
