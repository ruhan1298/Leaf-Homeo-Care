const twilio = require("twilio");
const crypto = require("crypto");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
console.log(accountSid,"ACCOUNT SID");

const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
console.log(verifyServiceSid,"VERIFY SERVICE SID");

const isTwilioConfigured = !!(accountSid && authToken && verifyServiceSid);

if (!isTwilioConfigured) {
  console.warn(
    "Twilio Verify not configured - using fallback OTP generation for development"
  );
}

const client = isTwilioConfigured ? twilio(accountSid, authToken) : null;

// In-memory OTP storage for development (fallback)
const otpStore = new Map();

module.exports = {
  client,
  verifyServiceSid,
  isConfigured: isTwilioConfigured,

  sendOTP: async (to) => {
    // Always generate and store local OTP as backup
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(to, { otp, expiry });
    
    console.log(`Local backup OTP stored for ${to}: ${otp}`);
    
    if (isTwilioConfigured && client) {
      try {
        const response = await client.verify.v2
          .services(verifyServiceSid)
          .verifications.create({
            to,
            channel: "sms",
          });
        console.log(`Twilio OTP sent successfully to ${to}`);
        return response;
      } catch (error) {
        console.error("Twilio Send OTP Error:", error);
        // Fallback to local OTP generation if Twilio fails
        console.log("Falling back to local OTP generation due to Twilio error");
        
        return {
          status: "pending",
          to: to,
          channel: "sms",
          otp: process.env.NODE_ENV === 'development' ? otp : undefined
        };
      }
    } else {
      // Fallback: Generate OTP locally for development
      console.log(`Development Mode: OTP for ${to} is ${otp}`);
      
      return {
        status: "pending",
        to: to,
        channel: "sms",
        // Include OTP in development mode for testing
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      };
    }
  },

  verifyOTP: async (to, code) => {
    console.log(`Verifying OTP for ${to} with code ${code}`);
    
    if (isTwilioConfigured && client) {
      try {
        const response = await client.verify.v2
          .services(verifyServiceSid)
          .verificationChecks.create({
            to,
            code,
          });
        return response;
      } catch (error) {
        console.error("Twilio Verify OTP Error:", error);
        // Fallback to local OTP verification if Twilio fails
        console.log("Falling back to local OTP verification due to Twilio error");
        
        const storedData = otpStore.get(to);
        console.log(`Stored data for ${to}:`, storedData ? 'Found' : 'Not found');
        
        if (!storedData) {
          console.log(`No OTP stored for ${to}`);
          return { status: "denied", valid: false };
        }
        
        if (Date.now() > storedData.expiry) {
          console.log(`OTP expired for ${to}`);
          otpStore.delete(to);
          return { status: "expired", valid: false };
        }
        
        console.log(`Comparing OTP: stored=${storedData.otp}, provided=${code}`);
        if (storedData.otp === code) {
          console.log(`OTP verified successfully for ${to}`);
          otpStore.delete(to);
          return { status: "approved", valid: true };
        }
        
        console.log(`OTP mismatch for ${to}`);
        return { status: "denied", valid: false };
      }
    } else {
      // Fallback: Verify OTP locally for development
      console.log("Using local OTP verification (Twilio not configured)");
      const storedData = otpStore.get(to);
      console.log(`Stored data for ${to}:`, storedData ? 'Found' : 'Not found');
      
      if (!storedData) {
        console.log(`No OTP stored for ${to}`);
        return { status: "denied", valid: false };
      }
      
      if (Date.now() > storedData.expiry) {
        console.log(`OTP expired for ${to}`);
        otpStore.delete(to);
        return { status: "expired", valid: false };
      }
      
      console.log(`Comparing OTP: stored=${storedData.otp}, provided=${code}`);
      if (storedData.otp === code) {
        console.log(`OTP verified successfully for ${to}`);
        otpStore.delete(to);
        return { status: "approved", valid: true };
      }
      
      console.log(`OTP mismatch for ${to}`);
      return { status: "denied", valid: false };
    }
  },
};