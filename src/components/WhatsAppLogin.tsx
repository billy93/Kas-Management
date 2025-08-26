'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

interface WhatsAppLoginProps {
  onSuccess?: () => void;
}

export default function WhatsAppLogin({ onSuccess }: WhatsAppLoginProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format Indonesian phone numbers
    if (digits.startsWith('0')) {
      // Local format: 0812-3456-7890
      return digits.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (digits.startsWith('62')) {
      // International format: +62-812-3456-7890
      return '+' + digits.replace(/(\d{2})(\d{3})(\d{4})(\d{4})/, '$1-$2-$3-$4');
    }
    
    return digits;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/whatsapp-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'request',
          phoneNumber: phoneNumber.replace(/\D/g, ''), // Remove formatting
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('OTP has been sent to your WhatsApp!');
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/whatsapp-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify',
          phoneNumber: phoneNumber.replace(/\D/g, ''), // Remove formatting
          otp,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Create a custom session using the verified user data
        const result = await signIn('whatsapp-otp', {
          phoneNumber: data.user.phoneNumber,
          userId: data.user.id,
          redirect: false,
        });

        if (result?.ok) {
          setSuccess('Login successful!');
          onSuccess?.();
        } else {
          setError('Failed to create session. Please try again.');
        }
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setError('');
    setSuccess('');
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/whatsapp-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'request',
          phoneNumber: phoneNumber.replace(/\D/g, ''),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('New OTP has been sent!');
      } else {
        setError(data.error || 'Failed to resend OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="text-center p-6 pb-4">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-green-100 rounded-full">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {step === 'phone' ? 'Login with WhatsApp' : 'Enter Verification Code'}
        </h2>
        <p className="text-gray-600">
          {step === 'phone'
            ? 'Enter your phone number to receive a verification code via WhatsApp'
            : `We sent a 6-digit code to ${formatPhoneNumber(phoneNumber)}`}
        </p>
      </div>
      <div className="p-6 pt-2 space-y-4">
        {error && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="border border-green-200 bg-green-50 rounded-lg p-3">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="relative">
                <svg className="absolute left-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <input
                  id="phone"
                  type="tel"
                  placeholder="0812-3456-7890 or +62-812-3456-7890"
                  value={formatPhoneNumber(phoneNumber)}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-gray-500">
                Enter your Indonesian phone number
              </p>
            </div>
            <button 
              type="submit" 
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center" 
              disabled={loading || !phoneNumber}
            >
              {loading ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending OTP...
                </>
              ) : (
                'Send Verification Code'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Verification Code</label>
              <input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-center text-2xl tracking-widest"
                maxLength={6}
                required
                disabled={loading}
              />
              <p className="text-sm text-gray-500 text-center">
                Enter the 6-digit code sent to your WhatsApp
              </p>
            </div>
            
            <div className="space-y-2">
              <button 
                type="submit" 
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center" 
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </button>
              
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="p-0 h-auto text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed underline"
                >
                  ← Change phone number
                </button>
                
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="p-0 h-auto text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed underline"
                >
                  Resend code
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}