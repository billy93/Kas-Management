// Test script untuk memverifikasi konfigurasi Resend
import { Resend } from 'resend';

// Manually set environment variables for testing
const RESEND_API_KEY = 're_M8vJ1vcf_NydbhMPJb25ieYu1fikDL3CK';
const REMINDER_FROM_EMAIL = 'onboarding@resend.dev';

const resend = new Resend(RESEND_API_KEY);

async function testEmail() {
  try {
    console.log('Testing Resend configuration...');
    console.log('API Key:', RESEND_API_KEY?.substring(0, 8) + '...');
    console.log('From Email:', REMINDER_FROM_EMAIL);
    
    const result = await resend.emails.send({
      from: `Kas App <${REMINDER_FROM_EMAIL}>`,
      to: ['billyfebram@gmail.com'], // Email testing Resend
      subject: 'Test Email - Kas App',
      html: '<h1>Test Email</h1><p>Jika Anda menerima email ini, konfigurasi Resend sudah benar!</p>',
    });
    
    console.log('✅ Email berhasil dikirim!');
    console.log('Email ID:', result.data?.id);
    console.log('Response:', result);
  } catch (error) {
    console.error('❌ Error mengirim email:');
    console.error('Status Code:', error.statusCode);
    console.error('Message:', error.message);
    console.error('Full Error:', error);
  }
}

testEmail();