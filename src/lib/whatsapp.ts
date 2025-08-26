export async function sendWhatsApp(toPhone: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { skipped: true };
  const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "text",
    text: { body: text }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`WhatsApp API error: ${res.status} ${t}`);
  }
  return res.json();
}

// Send WhatsApp OTP using existing WhatsApp integration
export async function sendWhatsAppOTP(phoneNumber: string, otp: string): Promise<void> {
  const message = `Your verification code is: ${otp}. This code will expire in 5 minutes.`;
  
  try {
    const result = await sendWhatsApp(phoneNumber, message);
    
    // If WhatsApp API is not configured, log to console for development
    if (result.skipped) {
      console.log(`\n=== WhatsApp OTP (Development Mode) ===`);
      console.log(`Phone: ${phoneNumber}`);
      console.log(`OTP: ${otp}`);
      console.log(`Message: ${message}`);
      console.log(`==========================================\n`);
    }
  } catch (error) {
    console.error('Failed to send WhatsApp OTP:', error);
    // In development, still log the OTP for testing
    console.log(`\n=== WhatsApp OTP (Fallback) ===`);
    console.log(`Phone: ${phoneNumber}`);
    console.log(`OTP: ${otp}`);
    console.log(`Message: ${message}`);
    console.log(`================================\n`);
    throw error;
  }
}

// Helper function to validate Indonesian phone numbers
export function validateIndonesianPhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^+\d]/g, '');
  
  // Indonesian phone number patterns:
  // +62xxx (international format)
  // 0xxx (local format)
  // 62xxx (without +)
  
  if (cleaned.startsWith('+62')) {
    return /^\+62[8-9]\d{8,11}$/.test(cleaned);
  } else if (cleaned.startsWith('62')) {
    return /^62[8-9]\d{8,11}$/.test(cleaned);
  } else if (cleaned.startsWith('0')) {
    return /^0[8-9]\d{8,11}$/.test(cleaned);
  }
  
  return false;
}

// Helper function to normalize Indonesian phone numbers
export function normalizeIndonesianPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^+\d]/g, '');
  
  if (cleaned.startsWith('0')) {
    return '+62' + cleaned.slice(1);
  } else if (cleaned.startsWith('62') && !cleaned.startsWith('+62')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('+62')) {
    return cleaned;
  }
  
  // If it doesn't match Indonesian patterns, assume it needs +62 prefix
  return '+62' + cleaned;
}
