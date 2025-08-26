"use client";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  useEffect(() => {
    // Auto sign out after 5 seconds if user doesn't take action
    const timer = setTimeout(() => {
      signOut({ callbackUrl: '/' });
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const handleContactAdmin = () => {
    // You can customize this to open email client or redirect to contact form
    let subject, body;
    
    if (error === 'email_not_verified') {
      subject = 'Bantuan Verifikasi Email KasApp';
      body = 'Halo Admin,%0A%0ASaya mengalami masalah dengan verifikasi email untuk akun KasApp saya. Mohon bantuan untuk memverifikasi email saya atau mengirim ulang link verifikasi.%0A%0ATerima kasih.';
    } else if (error === 'user_not_found') {
      subject = 'Permintaan Pendaftaran Akun KasApp';
      body = 'Halo Admin,%0A%0ASaya ingin mendapatkan akses ke sistem KasApp. Akun saya belum terdaftar dalam database. Mohon bantuan untuk mendaftarkan saya dan mengirimkan undangan akses.%0A%0ATerima kasih.';
    } else {
      subject = 'Permintaan Akses KasApp';
      body = 'Halo Admin,%0A%0ASaya ingin mendapatkan akses ke sistem KasApp. Mohon bantuan untuk mendaftarkan saya ke organisasi yang sesuai.%0A%0ATerima kasih.';
    }
    
    window.location.href = `mailto:admin@kasapp.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-500">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {error === 'email_not_verified' 
              ? 'Email Belum Terverifikasi' 
              : error === 'user_not_found' 
                ? 'Akun Tidak Terdaftar'
                : 'Akses Ditolak'
            }
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {error === 'email_not_verified' 
              ? 'Email Anda belum terverifikasi' 
              : error === 'user_not_found'
                ? 'Akun Anda tidak terdaftar dalam database sistem'
                : 'Anda tidak terdaftar dalam sistem ini'
            }
          </p>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Informasi Penting
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      {error === 'email_not_verified' 
                        ? 'Email Anda belum diverifikasi. Silakan cek email Anda untuk link verifikasi atau hubungi administrator untuk bantuan.'
                        : error === 'user_not_found'
                          ? 'Akun Anda tidak terdaftar dalam database sistem. Hanya pengguna yang diundang oleh administrator yang dapat mengakses sistem ini.'
                          : 'Akun Anda berhasil login, namun Anda belum terdaftar sebagai anggota di organisasi manapun dalam sistem KasApp.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="mb-4">
                {error === 'email_not_verified' 
                  ? 'Untuk dapat menggunakan sistem ini, Anda perlu:'
                  : error === 'user_not_found'
                    ? 'Untuk dapat mengakses sistem ini, Anda perlu:'
                    : 'Untuk dapat menggunakan sistem ini, Anda perlu:'
                }
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                {error === 'email_not_verified' ? (
                  <>
                    <li>Cek email Anda untuk link verifikasi</li>
                    <li>Klik link verifikasi yang dikirim ke email Anda</li>
                    <li>Jika tidak menemukan email, cek folder spam/junk</li>
                    <li>Hubungi administrator jika masih bermasalah</li>
                  </>
                ) : error === 'user_not_found' ? (
                  <>
                    <li>Menghubungi administrator sistem</li>
                    <li>Meminta untuk didaftarkan dalam database sistem</li>
                    <li>Menunggu administrator mengirimkan undangan email</li>
                    <li>Mengklik link undangan yang diterima via email</li>
                    <li>Melakukan login setelah akun terdaftar</li>
                  </>
                ) : (
                  <>
                    <li>Menghubungi administrator sistem</li>
                    <li>Meminta untuk didaftarkan ke organisasi yang sesuai</li>
                    <li>Menunggu konfirmasi dari administrator</li>
                  </>
                )}
              </ul>
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleContactAdmin}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                📧 Hubungi Administrator
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                🚪 Keluar dari Sistem
              </button>
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              Anda akan otomatis keluar dari sistem dalam 30 detik
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}