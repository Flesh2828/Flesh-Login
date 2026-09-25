'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight, 
  LogOut, 
  Copy, 
  Check, 
  Moon, 
  Sun, 
  AlertCircle, 
  CheckCircle2, 
  Settings, 
  X, 
  RefreshCw, 
  ExternalLink,
  Laptop,
  Clock,
  Mail,
  Lock,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';

interface GoogleJwtPayload {
  iss?: string;
  sub?: string;
  azp?: string;
  aud?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat?: number;
  exp?: number;
  locale?: string;
  [key: string]: unknown;
}

interface UserProfile {
  name: string;
  email: string;
  picture?: string;
  sub: string;
  provider: 'Google GCP (GIS SDK)' | 'Google GCP (Simulasi)' | 'Formulir Email/Password';
  loginTime: string;
  rawPayload: Record<string, unknown>;
}

interface ToastState {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Global declaration for Google Identity Services SDK
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              logo_alignment?: 'left' | 'center';
              width?: number;
            }
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

// Client ID provided by user
const INITIAL_GCP_CLIENT_ID = "350157557689-j0v46np6a4010250ktqt1v5iga3uiica.apps.googleusercontent.com";
const STORAGE_GCP_KEY = "gcp_oauth_client_id_tsx";
const STORAGE_SESSION_KEY = "portal_user_session_tsx";

function decodeJwt(token: string): GoogleJwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as GoogleJwtPayload;
  } catch (error) {
    console.error('Error decoding JWT payload:', error);
    return null;
  }
}

export default function App() {
  const [clientId, setClientId] = useState<string>(INITIAL_GCP_CLIENT_ID);
  const [inputClientId, setInputClientId] = useState<string>(INITIAL_GCP_CLIENT_ID);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Baca localStorage hanya saat komponen sudah berjalan di browser (client-side)
  useEffect(() => {
    try {
      const savedClientId = localStorage.getItem(STORAGE_GCP_KEY);
      if (savedClientId) {
        setClientId(savedClientId);
        setInputClientId(savedClientId);
      }

      const savedUser = localStorage.getItem(STORAGE_SESSION_KEY);
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }

      const savedTheme = localStorage.getItem('theme_pref');
      if (savedTheme === 'dark') {
        setDarkMode(true);
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
  }, []);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    title: '',
    message: '',
    type: 'info'
  });

  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, title, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3800);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_pref', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_pref', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const existingScript = document.getElementById('google-gsi-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleButton();
      document.body.appendChild(script);
    } else {
      initGoogleButton();
    }
  }, [clientId, darkMode, currentUser]);

  const initGoogleButton = () => {
    if (currentUser || !googleBtnRef.current) return;

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleSuccess,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: darkMode ? 'filled_black' : 'outline',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 320
          });
        }
      } catch (err) {
        console.warn('GIS render error:', err);
      }
    }
  };

  const handleGoogleSuccess = (response: { credential: string }) => {
    if (!response.credential) {
      setErrorMessage('Kredensial Google tidak diterima.');
      return;
    }

    const payload = decodeJwt(response.credential);
    if (!payload) {
      setErrorMessage('Gagal mendekode token JWT dari Google.');
      return;
    }

    const user: UserProfile = {
      name: payload.name || payload.given_name || 'Pengguna Google',
      email: payload.email || 'Akun Google Terverifikasi',
      picture: payload.picture,
      sub: payload.sub || 'sub-oauth-gcp',
      provider: 'Google GCP (GIS SDK)',
      loginTime: new Date().toISOString(),
      rawPayload: payload as Record<string, unknown>
    };

    saveSession(user);
    triggerToast('Login Berhasil!', `Selamat datang, ${user.name}`);
  };

  const handleSimulatedGoogleLogin = () => {
    const mockPayload: GoogleJwtPayload = {
      iss: "https://accounts.google.com",
      sub: "109876543210987654321",
      azp: clientId,
      aud: clientId,
      email: "hafidztaufip@gmail.com",
      email_verified: true,
      name: "Hafidz Taufiq",
      picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80",
      given_name: "Hafidz",
      family_name: "Taufiq",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      locale: "id"
    };

    const user: UserProfile = {
      name: mockPayload.name || 'Hafidz Taufiq',
      email: mockPayload.email || 'hafidztaufip@gmail.com',
      picture: mockPayload.picture,
      sub: mockPayload.sub || 'demo-sub',
      provider: 'Google GCP (Simulasi)',
      loginTime: new Date().toISOString(),
      rawPayload: mockPayload as Record<string, unknown>
    };

    saveSession(user);
    triggerToast('Mode Uji Coba Aktif', `Masuk menggunakan data demo simulasi Google.`);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Silakan isi alamat email atau nama pengguna Anda.');
      return;
    }
    if (!password) {
      setErrorMessage('Kata sandi tidak boleh kosong.');
      return;
    }
    if (password.length < 5) {
      setErrorMessage('Kata sandi minimal 5 karakter.');
      return;
    }

    setFormLoading(true);

    setTimeout(() => {
      setFormLoading(false);
      const parsedName = email.split('@')[0].replace(/[._]/g, ' ');
      const formattedName = parsedName.charAt(0).toUpperCase() + parsedName.slice(1);

      const user: UserProfile = {
        name: formattedName,
        email: email.includes('@') ? email : `${email}@local.domain`,
        picture: undefined,
        sub: 'pwd-' + Math.random().toString(36).substring(2, 9),
        provider: 'Formulir Email/Password',
        loginTime: new Date().toISOString(),
        rawPayload: {
          auth_type: 'Email & Password Verification',
          issued_at: new Date().toISOString(),
          remember_me: rememberMe
        }
      };

      saveSession(user);
      triggerToast('Autentikasi Sukses', `Selamat datang kembali, ${user.name}`);
    }, 600);
  };

  const saveSession = (user: UserProfile) => {
    setCurrentUser(user);
    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
  };

  const handleLogout = () => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (err) {
        console.log(err);
      }
    }
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    triggerToast('Logout Berhasil', 'Sesi Anda telah diakhiri dengan aman.', 'info');
  };

  const handleSaveClientId = () => {
    const cleaned = inputClientId.trim();
    if (!cleaned) {
      triggerToast('Peringatan', 'Client ID tidak boleh kosong.', 'error');
      return;
    }
    setClientId(cleaned);
    localStorage.setItem(STORAGE_GCP_KEY, cleaned);
    setIsConfigOpen(false);
    triggerToast('Client ID Disimpan', 'GCP OAuth Client ID berhasil diperbarui.');
  };

  const handleResetClientId = () => {
    setClientId(INITIAL_GCP_CLIENT_ID);
    setInputClientId(INITIAL_GCP_CLIENT_ID);
    localStorage.removeItem(STORAGE_GCP_KEY);
    setIsConfigOpen(false);
    triggerToast('Reset Default', 'Client ID dikembalikan ke pengaturan bawaan.', 'info');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
      triggerToast('Tersalin!', 'Payload token berhasil disalin.');
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200 antialiased font-sans">
      
      {/* Toast Notification */}
      <div 
        className={`fixed bottom-5 right-5 z-50 transition-all duration-300 transform ${
          toast.show ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm">
          <div className={`p-2 rounded-xl text-white ${
            toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{toast.title}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{toast.message}</p>
          </div>
        </div>
      </div>

      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Portal Auth TSX</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                GCP OAuth 2.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Google Cloud Identity Services Client</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setInputClientId(clientId);
              setIsConfigOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all shadow-sm"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Set Client ID</span>
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex-1 flex items-center justify-center p-4 sm:p-6">
        {!currentUser ? (
          <div className="w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Masuk ke Akun Anda</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pilih metode autentikasi yang Anda inginkan</p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Google Sign-in Section */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27 0-.78.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.02-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Google Identity Services</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                  {clientId.slice(0, 14)}...
                </span>
              </div>

              {/* Native GIS Render Target */}
              <div ref={googleBtnRef} className="flex justify-center min-h-[44px] items-center my-2" />

              {/* Instant Simulated Google Login */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleSimulatedGoogleLogin}
                  className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Uji Coba Cepat (Bypass Error 401 GCP)</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center leading-tight">
                  Gunakan tombol uji coba jika origin lokal Anda belum didaftarkan di Google Cloud Console.
                </p>
              </div>
            </div>

            {/* Separator */}
            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
              <span className="relative bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-medium">atau gunakan email</span>
            </div>

            {/* Manual Login Form */}
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Email atau Nama Pengguna
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => triggerToast('Reset Sandi', 'Tautan pemulihan akan dikirimkan ke email Anda.', 'info')}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Lupa sandi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Ingat saya</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('hafidztaufip@gmail.com');
                    setPassword('SandiRahasia123!');
                    triggerToast('Demo Diisi', 'Formulir terisi otomatis.');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Isi data demo
                </button>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-4xl space-y-6 animate-fade-in">
            {/* Header Hero Card */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                  {currentUser.picture ? (
                    <img
                      src={currentUser.picture}
                      alt={currentUser.name}
                      className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-md">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Berhasil Login</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {currentUser.provider}
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Selamat Datang, {currentUser.name}!
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {currentUser.email}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Masuk: {new Date(currentUser.loginTime).toLocaleTimeString('id-ID')} WIB</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Sesi Web Client Aktif</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleLogout}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>

              </div>
            </div>

            {/* Token Claims & GCP Troubleshooting Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Token Claims Viewer */}
              <div className="lg:col-span-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-indigo-500" />
                    <span>Payload Data Akun (Claims)</span>
                  </h3>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(currentUser.rawPayload, null, 2))}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPayload ? 'Tersalin' : 'Salin JSON'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-64 border border-slate-800">
                  {JSON.stringify(currentUser.rawPayload, null, 2)}
                </pre>
              </div>

              {/* Troubleshooting Error 401 Card */}
              <div className="lg:col-span-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    <span>Solusi Error 401 GCP</span>
                  </h3>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Pastikan tipe Client ID di GCP adalah <strong>Web application</strong> (bukan Desktop / iOS).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Tambahkan URL lokal Anda (misal: <code>http://localhost:5173</code>) ke <strong>Authorized JavaScript origins</strong> di GCP.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Di menu <strong>OAuth consent screen</strong>, tambahkan email Anda ke daftar <strong>Test users</strong>.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <span>Buka GCP Credentials</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* GCP Client ID Modal Drawer */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" />
                <span>Pengaturan GCP Client ID</span>
              </h3>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Konfigurasi ini langsung mengatur Client ID yang dipakai oleh SDK Google Identity Services. Tersimpan di <code>localStorage</code> browser Anda.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google OAuth 2.0 Web Client ID
                </label>
                <input
                  type="text"
                  value={inputClientId}
                  onChange={(e) => setInputClientId(e.target.value)}
                  placeholder="350...apps.googleusercontent.com"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300">
                Client ID aktif: <strong className="font-mono">{clientId}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleResetClientId}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={handleSaveClientId}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Simpan & Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
        Google Identity Services &copy; {new Date().getFullYear()} - Versi React + TypeScript (TSX)
      </footer>

    </div>
  );
}