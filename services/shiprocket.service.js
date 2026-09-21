const axios = require('axios');

class ShiprocketService {
  constructor() {
    this.apiKey = process.env.SHIPROCKET_API_KEY;
    this.apiEmail = process.env.SHIPROCKET_API_EMAIL;
    this.apiUrl = process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in';
    this.pickupLocationId = process.env.SHIPROCKET_PICKUP_LOCATION_ID; // Must be "work"
    this.enabled = !!(this.apiKey && this.apiEmail && this.pickupLocationId);
    this.token = null;
    this.tokenExpiry = null;

    console.log("Shiprocket Service initialized:", {
      hasApiKey: !!this.apiKey,
      hasApiEmail: !!this.apiEmail,
      hasPickupLocationId: !!this.pickupLocationId,
      apiUrl: this.apiUrl,
      enabled: this.enabled
    });
  }

  isEnabled() {
    return this.enabled;
  }

  async getAuthHeaders() {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      };
    }

    const isLoggedIn = await this.login();
    if (!isLoggedIn) {
      throw new Error("Shiprocket Authentication Failed");
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  async login() {
    try {
      console.log("Shiprocket login attempt:", {
        hasEmail: !!this.apiEmail,
        hasApiKey: !!this.apiKey
      });

      const response = await axios.post(
        `${this.apiUrl}/v1/external/auth/login`,
        {
          email: this.apiEmail,
          password: this.apiKey
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.data && response.data.token) {
        this.token = response.data.token;
        this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours validity
        console.log("Shiprocket login successful");
        return true;
      } else {
        console.error("Shiprocket login failed: No token in response");
        return false;
      }
    } catch (error) {
      console.error("Shiprocket login error:", error.response?.data || error.message);
      this.token = null;
      return false;
    }
  }

  async createOrder(orderData) {
    if (!this.enabled) {
      console.log('Shiprocket integration disabled - skipping order creation');
      return { success: false, message: 'Shiprocket integration disabled' };
    }

    try {
      console.log("Creating Shiprocket order...");
      const headers = await this.getAuthHeaders();

      const response = await axios.post(
        `${this.apiUrl}/v1/external/orders/create/adhoc`,
        orderData,
        { headers }
      );

      console.log("Shiprocket API response:", {
        status: response.status,
        dataStatus: response.data.status,
        shipmentId: response.data.shipment_id,
        orderId: response.data.order_id
      });

      // Shiprocket status 1 ya order_id presence check
      if (response.data && (response.data.status === 1 || response.data.order_id)) {
        return {
          success: true,
          data: response.data,
          // Awb_code manual process me baad me aata h, isliye order_id / shipment_id return karenge
          shipmentId: response.data.shipment_id,
          orderId: response.data.order_id
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
      const headers = await this.getAuthHeaders();

      const response = await axios.get(
        `${this.apiUrl}/v1/external/courier/track/awb/${awbCode}`,
        { headers }
      );

      return {
        success: true,
        data: response.data
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
    // Correct format: YYYY-MM-DD HH:mm
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 16);

    return {
      order_id: `ORD-${appointment.id}-${Date.now()}`,
      order_date: formattedDate,
      pickup_location: this.pickupLocationId, // Dashboard Address Nickname ("work")
      
      // Mandatory Customer Billing Details
      billing_customer_name: patientAddress.name || "Patient",
      billing_last_name: "",
      billing_address: patientAddress.addressLine1 || "Address Line 1",
      billing_address_2: patientAddress.addressLine2 || "",
      billing_city: patientAddress.city || "Ahmedabad",
      billing_pincode: patientAddress.pincode || "380001",
      billing_state: patientAddress.state || "Gujarat",
      billing_country: patientAddress.country || "India",
      billing_email: patientAddress.email || "patient@example.com",
      billing_phone: patientAddress.mobile || "9876543210",
      shipping_is_billing: true,

      order_items: [
        {
          name: "Homoeopathic Medicine",
          sku: `MED-${appointment.id}`,
          units: 1,
          selling_price: appointment.payment?.amount || 1,
          discount: 0,
          tax: 0,
          hsn: 30049060
        }
      ],
      payment_method: "Prepaid",
      sub_total: appointment.payment?.amount || 1,
      length: 28,   // 11 inch = 28 cm
  breadth: 13,  // 5 inch = 13 cm
  height: 5,    // Default 5 cm
  weight: 0.25  // 250 gram = 0.25 kg
    };
  }
}

const shiprocketService = new ShiprocketService();
module.exports = shiprocketService;