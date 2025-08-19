import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send');
    return { skipped: true };
  }

  const fromEmail = process.env.REMINDER_FROM_EMAIL || "onboarding@resend.dev";
  
  try {
    console.log('Attempting to send email:', {
      from: fromEmail,
      to,
      subject,
      apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 8) + '...'
    });

    const result = await resend.emails.send({
      from: `Kas App <${fromEmail}>`,
      to: [to], 
      subject, 
      html
    });
    
    console.log('Email sent successfully:', { 
      to, 
      subject, 
      id: result.data?.id,
      from: fromEmail 
    });
    return result;
  } catch (error: any) {
    console.error('Failed to send email:', {
      error: error?.message || 'Unknown error',
      statusCode: error?.statusCode,
      name: error?.name,
      to,
      subject,
      from: fromEmail,
      fullError: error
    });
    
    // Provide more specific error messages
    if (error?.statusCode === 403) {
      throw new Error(`Email sending forbidden (403): ${error?.message || 'Domain not verified or API key invalid'}`);
    }
    
    // Always throw a proper Error object instead of the original error
    throw new Error(`Email sending failed: ${error?.message || 'Unknown error'}`);
  }
}