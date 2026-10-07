import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  User as UserIcon,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  Globe,
  Building,
  MapPin,
  Camera,
  X,
  Eye,
  EyeOff,
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

export const UserSignupPage: React.FC = () => {
  const { language, setLanguage, isRTL } = useLanguage();
  const { signup } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    projectName: '',
    projectRegion: '',
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    avatarUrl: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Profile image upload handler (reads as Base64)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toastError(isRTL ? 'حجم الصورة يجب أن لا يتجاوز 2 ميجابايت' : 'Image size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, avatarUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!formData.projectName.trim()) {
      errs.projectName = isRTL ? 'اسم المشروع مطلوب' : 'Project name is required';
    }

    if (!formData.projectRegion.trim()) {
      errs.projectRegion = isRTL ? 'منطقة المشروع مطلوبة' : 'Project region is required';
    }

    if (!formData.fullName.trim()) {
      errs.fullName = isRTL ? 'اسم المستخدم مطلوب' : 'App user name is required';
    }

    if (!formData.email.trim()) {
      errs.email = isRTL ? 'البريد الإلكتروني مطلوب' : 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = isRTL ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please provide a valid email';
    }

    if (!formData.password) {
      errs.password = isRTL ? 'كلمة المرور مطلوبة' : 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    try {
      const created = await signup({
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        mobile: formData.mobile.trim(),
        projectName: formData.projectName.trim(),
        projectRegion: formData.projectRegion.trim(),
        avatarUrl: formData.avatarUrl || undefined,
      });

      success(
        isRTL
          ? `مرحباً بك في مشروع ${created.projectName || formData.projectName}! تم تسجيل حسابك بنجاح.`
          : `Welcome to ${created.projectName || formData.projectName}! Account & Project registered successfully.`
      );
      navigate('/app');
    } catch (err: any) {
      toastError(err.message || (isRTL ? 'فشل إنشاء الحساب' : 'Account creation failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-neutral-900 flex flex-col justify-between selection:bg-orange-500 selection:text-white px-4 py-6">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isRTL ? 'الرجوع إلى تسجيل الدخول' : 'Back to Login'}</span>
        </Link>

        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition"
        >
          <Globe className="w-3.5 h-3.5 text-orange-600" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </header>

      {/* Centered Signup Card */}
      <main className="w-full max-w-[480px] mx-auto my-auto py-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="flex justify-center mb-2">
              <img
                src="/logo.jpg"
                alt="Zahran Logo"
                className="h-16 w-auto max-w-[210px] object-contain rounded-xl shadow-xs border border-neutral-200/80 p-0.5 bg-neutral-900"
              />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              {isRTL ? 'إنشاء حساب وتسجيل مشروع جديد' : 'Create Account & Register Project'}
            </h1>
            <p className="text-xs text-neutral-500">
              {isRTL
                ? 'سجل بياناتك والمشروع الخاص بك للبدء في إدارة المخيمات والعمليات الميدانية'
                : 'Register your details and project to start managing camp operations'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Profile Picture Upload (Optional) */}
            <div className="flex flex-col items-center justify-center pb-2">
              <div className="relative group">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-neutral-300 hover:border-orange-500 bg-neutral-50 flex items-center justify-center cursor-pointer overflow-hidden transition shadow-2xs"
                  title={isRTL ? 'تحميل صورة شخصية (اختياري)' : 'Upload profile picture (optional)'}
                >
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
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

                {formData.avatarUrl && (
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
                  {formData.avatarUrl
                    ? (isRTL ? 'تغيير الصورة' : 'Change Photo')
                    : (isRTL ? 'تحميل صورة شخصية (اختياري)' : 'Upload Profile Photo (Optional)')}
                </button>
              </div>
            </div>

            {/* 2. Project Name & Region */}
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
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder={isRTL ? 'مثال: مشروع الشرق' : 'e.g. Sharq Project'}
                    className={`w-full h-9 ps-9 pe-3 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                      errors.projectName ? 'border-rose-400' : 'border-neutral-300'
                    }`}
                  />
                </div>
                {errors.projectName && <p className="text-[11px] text-rose-600 mt-1">{errors.projectName}</p>}
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
                    list="signup-region-options"
                    value={formData.projectRegion}
                    onChange={(e) => setFormData({ ...formData, projectRegion: e.target.value })}
                    placeholder={isRTL ? 'مثال: المنطقة الشرقية' : 'e.g. Eastern Province'}
                    className={`w-full h-9 ps-9 pe-3 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                      errors.projectRegion ? 'border-rose-400' : 'border-neutral-300'
                    }`}
                  />
                  <datalist id="signup-region-options">
                    {REGION_OPTIONS.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
                {errors.projectRegion && <p className="text-[11px] text-rose-600 mt-1">{errors.projectRegion}</p>}
              </div>
            </div>

            {/* 3. App User Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {isRTL ? 'اسم المستخدم (الاسم الكامل)' : 'App User Name (Full Name)'} <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Faisal Al-Harbi"
                  className={`w-full h-9 ps-9 pe-3 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                    errors.fullName ? 'border-rose-400' : 'border-neutral-300'
                  }`}
                />
              </div>
              {errors.fullName && <p className="text-[11px] text-rose-600 mt-1">{errors.fullName}</p>}
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="faisal@sharq.com"
                  className={`w-full h-9 ps-9 pe-3 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                    errors.email ? 'border-rose-400' : 'border-neutral-300'
                  }`}
                />
              </div>
              {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>}
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
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className={`w-full h-9 ps-9 pe-9 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                      errors.password ? 'border-rose-400' : 'border-neutral-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-[11px] text-rose-600 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className={`w-full h-9 ps-9 pe-3 bg-white border rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                      errors.confirmPassword ? 'border-rose-400' : 'border-neutral-300'
                    }`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.confirmPassword}</p>
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
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="+966 50 123 4567"
                  className="w-full h-9 ps-9 pe-3 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>
            </div>

            {/* Notice about project isolation */}
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
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {isRTL ? 'إنشاء الحساب وتسجيل المشروع' : 'Create Account & Register Project'}
            </Button>
          </form>

          {/* Already have an account */}
          <div className="text-center pt-2 border-t border-neutral-100">
            <p className="text-xs text-neutral-600">
              {isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
              <Link to="/login" className="text-orange-600 hover:text-orange-700 font-semibold ms-1">
                {isRTL ? 'تسجيل الدخول' : 'Sign In'}
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-neutral-400">
        &copy; 2026 Camps Manager &bull; {isRTL ? 'نظام إدارة المخيمات' : 'Enterprise Camp Platform'}
      </footer>
    </div>
  );
};
