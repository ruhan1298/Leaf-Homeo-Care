const axios = require('axios');

class ShiprocketService {
  constructor() {
    this.apiKey = process.env.SHIPROCKET_API_KEY;
    this.apiEmail = process.env.SHIPROCKET_API_EMAIL;
    this.apiUrl = process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in';
    this.enabled = !!(this.apiKey && this.apiEmail);
    
    console.log("Shiprocket Service initialized:", {
      hasApiKey: !!this.apiKey,
      hasApiEmail: !!this.apiEmail,
      apiUrl: this.apiUrl,
      enabled: this.enabled
    });
  }

  
  isEnabled() {
    return this.enabled;
  }

  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  async createOrder(orderData) {
    if (!this.enabled) {
      console.log('Shiprocket integration disabled - skipping order creation');
      return { success: false, message: 'Shiprocket integration disabled' };
    }

    try {
      console.log("Creating Shiprocket order:", {
        url: `${this.apiUrl}/v1/external/orders/create/adhoc`,
        hasAuth: !!this.apiKey
      });
      
      console.log("Order data:", JSON.stringify(orderData, null, 2));
      
      const response = await axios.post(
        `${this.apiUrl}/v1/external/orders/create/adhoc`,
        orderData,
        { headers: this.getAuthHeaders() }
      );

      console.log("Shiprocket API response:", {
        status: response.status,
        dataStatus: response.data.status,
        hasData: !!response.data.data
      });

      if (response.data.status === 1) {
        return {
          success: true,
          data: response.data.data,
          trackingId: response.data.data.awb_code,
          orderId: response.data.data.order_id
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to create order'
        };
      }
    } catch (error) {
      console.error('Shiprocket order creation error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create order'
      };
    }
  }

  async getTrackingStatus(awbCode) {
    if (!this.enabled) {
      return { success: false, message: 'Shiprocket integration disabled' };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/courier/track/awb/${awbCode}`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Shiprocket tracking error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get tracking status'
      };
    }
  }

  formatOrderData(appointment, patientAddress) {
    return {
      order_id: `ORD-${appointment.id}-${Date.now()}`,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: "123456", // Default pickup location ID - should be configured in Shiprocket
      billing_customer_name: patientAddress.name,
      billing_last_name: "",
      billing_address: patientAddress.addressLine1,
      billing_address_2: patientAddress.addressLine2 || "",
      billing_city: patientAddress.city,
      billing_pincode: patientAddress.pincode,
      billing_state: patientAddress.state,
      billing_country: patientAddress.country || "India",
      billing_email: patientAddress.email,
      billing_phone: patientAddress.mobile,
      shipping_customer_name: patientAddress.name,
      shipping_last_name: "",
      shipping_address: patientAddress.addressLine1,
      shipping_address_2: patientAddress.addressLine2 || "",
      shipping_city: patientAddress.city,
      shipping_pincode: patientAddress.pincode,
      shipping_state: patientAddress.state,
      shipping_country: patientAddress.country || "India",
      shipping_email: patientAddress.email,
      shipping_phone: patientAddress.mobile,
      order_items: [
        {
          name: "Homeopathy Medicine",
          sku: `MED-${appointment.id}`,
          units: 1,
          selling_price: appointment.payment?.amount || 0,
          discount: 0,
          tax: 0,
          hsn: 3004
        }
      ],
      payment_method: "Prepaid",
      sub_total: appointment.payment?.amount || 0,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5
    };
  }
}

module.exports = new ShiprocketService();