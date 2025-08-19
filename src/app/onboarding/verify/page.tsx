"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

interface VerificationResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
  };
  organization?: {
    id: string;
    name: string;
  };
  membership?: {
    role: string;
  };
  member?: {
    id: string;
    name: string;
    email: string;
  };
  error?: string;
}

export default function OnboardingVerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyToken(token);
    } else {
      setResult({
        success: false,
        error: "Token tidak ditemukan",
        message: "Link undangan tidak valid"
      });
      setLoading(false);
    }
  }, [searchParams]);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(`/api/onboarding/verify?token=${token}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setResult({
          success: false,
          error: data.error || "Verifikasi gagal",
          message: "Terjadi kesalahan saat memverifikasi undangan"
        });
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setResult({
        success: false,
        error: "Network error",
        message: "Gagal terhubung ke server"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn('google', { 
        callbackUrl: '/dashboard',
        redirect: true 
      });
    } catch (error) {
      console.error('Error signing in:', error);
      setIsSigningIn(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrator';
      case 'TREASURER': return 'Bendahara';
      case 'VIEWER': return 'Viewer';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Memverifikasi Undangan...</h2>
            <p className="text-gray-600">Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Terjadi Kesalahan</h2>
            <p className="text-gray-600 mb-6">Tidak dapat memproses undangan</p>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifikasi Gagal</h2>
            <p className="text-gray-600 mb-2">{result.message}</p>
            {result.error && (
              <p className="text-sm text-red-600 mb-6">Error: {result.error}</p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Kembali ke Beranda
              </button>
              <p className="text-xs text-gray-500">
                Jika masalah berlanjut, hubungi administrator organisasi
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full mx-4">
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang!</h2>
          <p className="text-gray-600 mb-6">{result.message}</p>
          
          {result.organization && result.membership && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Detail Keanggotaan:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Organisasi:</span>
                  <span className="font-medium">{result.organization.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium">{getRoleLabel(result.membership.role)}</span>
                </div>
                {result.user && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{result.user.email}</span>
                  </div>
                )}
                {result.member && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama Member:</span>
                    <span className="font-medium">{result.member.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Untuk mulai menggunakan sistem, silakan login dengan akun Gmail Anda:
            </p>
            
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isSigningIn ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Mengarahkan...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Login dengan Google</span>
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-500">
              Pastikan Anda login dengan email: <strong>{result.user?.email}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}