import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Globe,
  Building,
  MapPin,
  Camera,
  X,
  Eye,
  EyeOff,
  User as UserIcon,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';

const REGION_OPTIONS = [
  'Eastern Province (المنطقة الشرقية)',
  'Riyadh Region (منطقة الرياض)',
  'Western / Makkah & Jeddah (الغربية / جدة)',
  'Neom & Tabuk (نيوم وتبوك)',
  'Southern Region (المنطقة الجنوبية)',
  'Northern Borders (الحدود الشمالية)',
];

export const UserLoginPage: React.FC = () => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { login, signup } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab mode: 'login' | 'signup'
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Signup form state
  const [signupData, setSignupData] = useState({
    projectName: '',
    projectRegion: '',
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    avatarUrl: '',
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [isSignupLoading, setIsSignupLoading] = useState(false);

  // Profile picture upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toastError(isRTL ? 'حجم الصورة يجب أن لا يتجاوز 2 ميجابايت' : 'Image size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignupData((prev) => ({ ...prev, avatarUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSignupData((prev) => ({ ...prev, avatarUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoginLoading(true);

    try {
      const user = await login({ email: loginEmail, password: loginPassword, isAdmin: false });
      success(
        isRTL
          ? `مرحباً بك مجدداً في مشروع ${user.projectName || 'المخيم'}!`
          : `Welcome back to ${user.projectName || 'Camp Project'}!`
      );
      navigate('/app');
    } catch (err: any) {
      const msg = err.message || (isRTL ? 'فشل تسجيل الدخول' : 'Authentication failed');
      setLoginError(msg);
      toastError(msg);
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Signup validation
  const validateSignup = () => {
    const errs: Record<string, string> = {};

    if (!signupData.projectName.trim()) {
      errs.projectName = isRTL ? 'اسم المشروع مطلوب' : 'Project name is required';
    }

    if (!signupData.projectRegion.trim()) {
      errs.projectRegion = isRTL ? 'منطقة المشروع مطلوبة' : 'Project region is required';
    }

    if (!signupData.fullName.trim()) {
      errs.fullName = isRTL ? 'اسم المستخدم مطلوب' : 'App user name is required';
    }

    if (!signupData.email.trim()) {
      errs.email = isRTL ? 'البريد الإلكتروني مطلوب' : 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) {
      errs.email = isRTL ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please provide a valid email';
    }

    if (!signupData.password) {
      errs.password = isRTL ? 'كلمة المرور مطلوبة' : 'Password is required';
    } else if (signupData.password.length < 6) {
      errs.password = isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters';
    }

    if (signupData.password !== signupData.confirmPassword) {
      errs.confirmPassword = isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
    }

    setSignupErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Signup submit
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;
    setIsSignupLoading(true);

    try {
      const created = await signup({
        name: signupData.fullName.trim(),
        email: signupData.email.trim(),
        password: signupData.password,
        mobile: signupData.mobile.trim(),
        projectName: signupData.projectName.trim(),
        projectRegion: signupData.projectRegion.trim(),
        avatarUrl: signupData.avatarUrl || undefined,
      });

      success(
        isRTL
          ? `مرحباً بك في مشروع ${created.projectName}! تم إنشاء الحساب وتسجيل المشروع بنجاح.`
          : `Welcome to ${created.projectName}! Account & Project registered successfully.`
      );
      navigate('/app');
    } catch (err: any) {
      toastError(err.message || (isRTL ? 'فشل إنشاء الحساب' : 'Account creation failed'));
    } finally {
      setIsSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-neutral-900 flex flex-col justify-between selection:bg-orange-500 selection:text-white px-4 py-6">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="Zahran Logo"
            className="h-9 w-auto max-w-[100px] object-contain rounded-md shadow-2xs border border-neutral-200/80 bg-neutral-900"
          />
          <span className="font-bold text-sm tracking-tight text-neutral-900">
            Camps Manager
          </span>
        </div>

        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition"
        >
          <Globe className="w-3.5 h-3.5 text-orange-600" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </header>

      {/* Main Card */}
      <main className={`w-full ${activeTab === 'signup' ? 'max-w-[480px]' : 'max-w-[400px]'} mx-auto my-auto py-4 transition-all duration-200`}>
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          {/* Header Title & Subtitle with Brand Logo */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <img
                src="/logo.jpg"
                alt="Zahran Logo"
                className="h-16 w-auto max-w-[210px] object-contain rounded-xl shadow-xs border border-neutral-200/80 p-0.5 bg-neutral-900"
              />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900">
              {activeTab === 'login'
                ? (isRTL ? 'تسجيل الدخول' : 'Sign In to Camps Manager')
                : (isRTL ? 'إنشاء حساب وتسجيل مشروع جديد' : 'Create Account & Register Project')}
            </h1>
            <p className="text-xs text-neutral-500">
              {activeTab === 'login'
                ? (isRTL ? 'أدخل بريدك الإلكتروني وكلمة المرور للمتابعة' : 'Enter your credentials to access your camp project')
                : (isRTL ? 'سجل مشروعك الجديد وبيانات حسابك للبدء في إدارة المخيم' : 'Register your project and account to start operations')}
            </p>
          </div>

          {/* Segmented Tab Switcher: Login / Create Account */}
          <div className="flex p-1 bg-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'login'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {isRTL ? 'تسجيل الدخول' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'signup'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {isRTL ? 'إنشاء حساب جديد' : 'Create Account'}
            </button>
          </div>

          {/* LOGIN FORM */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              {loginError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@zahran.camp"
                      className="w-full h-9 ps-9 pe-3 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-700">
                      {t('auth.password')}
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-[11px] text-neutral-500 hover:text-orange-600 transition"
                    >
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-9 ps-9 pe-9 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full h-9 text-xs mt-2 font-semibold"
                  isLoading={isLoginLoading}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  {isRTL ? 'تسجيل الدخول' : 'Sign In'}
                </Button>
              </form>

              {/* Demo hints */}
              <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/80 text-[11px] text-neutral-500 text-center">
                <span>{isRTL ? 'أو أنشئ حسابك ومروعك الخاص من تبويب "إنشاء حساب جديد"' : 'Or create your own project account using "Create Account" tab'}</span>
              </div>
            </div>
          )}

          {/* SIGNUP FORM */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              {/* 1. Upload Profile Picture (Optional) */}
              <div className="flex flex-col items-center justify-center pb-1">
                <div className="relative group">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-neutral-300 hover:border-orange-500 bg-neutral-50 flex items-center justify-center cursor-pointer overflow-hidden transition shadow-2xs"
                    title={isRTL ? 'تحميل صورة شخصية (اختياري)' : 'Upload profile picture (optional)'}
                  >
                    {signupData.avatarUrl ? (
                      <img
                        src={signupData.avatarUrl}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-neutral-400 group-hover:text-orange-600 transition">
                        <Camera className="w-6 h-6" />
                        <span className="text-[9px] mt-0.5 font-medium">
                          {isRTL ? 'صورة' : 'Photo'}
                        </span>
                      </div>
                    )}
                  </div>

                  {signupData.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-1 -end-1 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center shadow hover:bg-rose-700 transition"
                      title={isRTL ? 'إزالة الصورة' : 'Remove photo'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    {signupData.avatarUrl
                      ? (isRTL ? 'تغيير الصورة' : 'Change Photo')
                      : (isRTL ? 'تحميل صورة شخصية (اختياري)' : 'Upload Profile Photo (Optional)')}
                  </button>
                </div>
              </div>

              {/* 2. Project Name & Project Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'اسم المشروع' : 'Project Name'} <span className="text-orange-600">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={signupData.projectName}
                      onChange={(e) => setSignupData({ ...signupData, projectName: e.target.value })}
                      placeholder={isRTL ? 'مثال: مشروع الشرق' : 'e.g. Sharq'}
                      className={`w-full h-9 ps-9 pe-3 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                        signupErrors.projectName ? 'border-rose-400' : 'border-neutral-300'
                      }`}
                    />
                  </div>
                  {signupErrors.projectName && (
                    <p className="text-[11px] text-rose-600 mt-1">{signupErrors.projectName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'منطقة المشروع' : 'Project Region'} <span className="text-orange-600">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      required
                      list="login-region-options"
                      value={signupData.projectRegion}
                      onChange={(e) => setSignupData({ ...signupData, projectRegion: e.target.value })}
                      placeholder={isRTL ? 'المنطقة الشرقية' : 'Eastern Province'}
                      className={`w-full h-9 ps-9 pe-3 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                        signupErrors.projectRegion ? 'border-rose-400' : 'border-neutral-300'
                      }`}
                    />
                    <datalist id="login-region-options">
                      {REGION_OPTIONS.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </div>
                  {signupErrors.projectRegion && (
                    <p className="text-[11px] text-rose-600 mt-1">{signupErrors.projectRegion}</p>
                  )}
                </div>
              </div>

              {/* 3. App User Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'اسم المستخدم (الاسم الكامل)' : 'App User Name'} <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                    placeholder="e.g. Faisal Al-Harbi"
                    className={`w-full h-9 ps-9 pe-3 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                      signupErrors.fullName ? 'border-rose-400' : 'border-neutral-300'
                    }`}
                  />
                </div>
                {signupErrors.fullName && (
                  <p className="text-[11px] text-rose-600 mt-1">{signupErrors.fullName}</p>
                )}
              </div>

              {/* 4. Email */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'البريد الإلكتروني' : 'Email Address'} <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    placeholder="faisal@sharq.com"
                    className={`w-full h-9 ps-9 pe-3 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                      signupErrors.email ? 'border-rose-400' : 'border-neutral-300'
                    }`}
                  />
                </div>
                {signupErrors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{signupErrors.email}</p>
                )}
              </div>

              {/* 5. Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'كلمة المرور' : 'Password'} <span className="text-orange-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      placeholder="••••••••"
                      className={`w-full h-9 ps-9 pe-9 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                        signupErrors.password ? 'border-rose-400' : 'border-neutral-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {signupErrors.password && (
                    <p className="text-[11px] text-rose-600 mt-1">{signupErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="text-orange-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className={`w-full h-9 ps-9 pe-3 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                        signupErrors.confirmPassword ? 'border-rose-400' : 'border-neutral-300'
                      }`}
                    />
                  </div>
                  {signupErrors.confirmPassword && (
                    <p className="text-[11px] text-rose-600 mt-1">{signupErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* 6. Mobile Number (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-neutral-700">
                    {isRTL ? 'رقم الجوال' : 'Mobile Number'}
                  </label>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    {isRTL ? 'اختياري' : 'Optional'}
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="tel"
                    value={signupData.mobile}
                    onChange={(e) => setSignupData({ ...signupData, mobile: e.target.value })}
                    placeholder="+966 50 123 4567"
                    className="w-full h-9 ps-9 pe-3 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200/80 text-[11px] text-orange-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span>
                  {isRTL
                    ? 'سيتم تسجيل هذا المشروع بشكل مستقل تماماً في النظام وستكون كافة البيانات خاصة بك وحدك وبالمسؤول.'
                    : 'This project will be registered with complete data isolation. Only you and system administrators have access.'}
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full h-10 text-xs font-semibold"
                isLoading={isSignupLoading}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                {isRTL ? 'إنشاء الحساب وتسجيل المشروع' : 'Create Account & Register Project'}
              </Button>
            </form>
          )}

          {/* Bottom Switcher */}
          <div className="text-center pt-2 border-t border-neutral-100">
            {activeTab === 'login' ? (
              <p className="text-xs text-neutral-600">
                {isRTL ? 'ليس لديك حساب ومشروع مسجل؟' : "Don't have an account or project?"}{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className="text-orange-600 hover:text-orange-700 font-semibold ms-1"
                >
                  {isRTL ? 'إنشاء حساب جديد' : 'Create account'}
                </button>
              </p>
            ) : (
              <p className="text-xs text-neutral-600">
                {isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-orange-600 hover:text-orange-700 font-semibold ms-1"
                >
                  {isRTL ? 'تسجيل الدخول' : 'Sign In'}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Small Admin Portal Link */}
        <div className="text-center mt-3">
          <Link
            to="/admin/login"
            className="text-[11px] text-neutral-400 hover:text-neutral-700 transition"
          >
            {isRTL ? 'تسجيل الدخول كمسؤول' : 'Login as Admin'}
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-neutral-400">
        &copy; 2026 Camps Manager &bull; {isRTL ? 'نظام إدارة المخيمات' : 'Enterprise Camp Platform'}
      </footer>
    </div>
  );
};
