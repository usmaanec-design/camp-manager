import React, { useState, useRef } from 'react';
import {
  Camera,
  Mail,
  Lock,
  Phone,
  Building2,
  Shield,
  Save,
  Eye,
  EyeOff,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const UserProfilePage: React.FC = () => {
  const { isRTL } = useLanguage();
  const { user, updateProfile } = useAuth();
  const { success, error: toastError } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [password, setPassword] = useState(user?.password || 'User@123456');
  const [confirmPassword, setConfirmPassword] = useState(user?.password || 'User@123456');
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatarUrl);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  // Handle Profile Picture Upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastError(isRTL ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toastError(isRTL ? 'حجم الصورة كبير جداً (الحد الأقصى 2 ميجابايت)' : 'Image size is too large (max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toastError(isRTL ? 'يرجى إدخال الاسم' : 'Please enter your name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      toastError(isRTL ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address');
      return;
    }

    if (!password.trim()) {
      toastError(isRTL ? 'يرجى إدخال كلمة المرور' : 'Password cannot be empty');
      return;
    }

    if (password !== confirmPassword) {
      toastError(isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        password: password.trim(),
        avatarUrl: avatarPreview,
      });

      success(isRTL ? 'تم حفظ بيانات الملف الشخصي بنجاح' : 'Profile updated successfully');
    } catch (err: any) {
      toastError(err?.message || (isRTL ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-50 text-orange-700 text-xs font-semibold mb-2 border border-orange-200">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{isRTL ? 'الملف الشخصي والبيانات' : 'Account & Credentials'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            {isRTL ? 'الملف الشخصي للمستخدم' : 'My User Profile'}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {isRTL
              ? 'تحديث صورة الحساب، البريد الإلكتروني، وكلمة المرور وتفاصيل تسجيل الدخول'
              : 'Manage your profile avatar, email address, password, and assigned camp settings.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Main Profile Info Card */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Avatar Upload Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-neutral-200">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-900 text-orange-500 flex items-center justify-center font-black text-3xl border-4 border-orange-500 shadow-md relative">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{name.charAt(0).toUpperCase() || 'U'}</span>
                  )}
                </div>

                {/* Upload Button Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105"
                  title={isRTL ? 'تغيير الصورة' : 'Change picture'}
                >
                  <Camera className="w-4 h-4" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-neutral-900">
                  {isRTL ? 'الصورة الشخصية' : 'Profile Picture'}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed max-w-md">
                  {isRTL
                    ? 'قم بتحميل صورة مصغرة تظهر في لوحة التحكم وتظهر أيضاً للمسؤول في لوحة الإدارة.'
                    : 'Upload a personal profile picture. It will display in your portal header and be visible to the admin.'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                    {isRTL ? 'تحميل صورة جديدة' : 'Upload New Photo'}
                  </Button>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      className="text-xs border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {isRTL ? 'إزالة' : 'Remove'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields: Name, Email, Phone, Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  {isRTL ? 'الاسم الكامل *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Corporate Email Address */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  {isRTL ? 'البريد الإلكتروني (لتسجيل الدخول) *' : 'Email Address (Login) *'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Mobile Telephone */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  {isRTL ? 'رقم الهاتف المحمول' : 'Mobile Telephone'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Assigned Project & Camp (Context) */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  {isRTL ? 'المعسكر والمشروع المخصص' : 'Assigned Project & Camp'}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    disabled
                    value={user.projectName || (user.role === 'USER' ? 'Sharq Camp' : 'Sharq Camp')}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-700 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  {isRTL ? 'كلمة المرور الجديدة *' : 'Password *'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  {isRTL ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Note on Admin Visibility */}
            <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl text-xs text-neutral-700 flex items-start gap-3">
              <Shield className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-orange-900 block font-bold mb-0.5">
                  {isRTL ? 'إشعار الخصوصية والحوكمة' : 'Enterprise Credentials Governance'}
                </strong>
                {isRTL
                  ? 'يتم تحديث وتوثيق البريد الإلكتروني وكلمة المرور وتاريخ آخر نشاط تلقائياً، وتكون متاحة للإدارة المركزية لمتابعة سجلات تشغيل المخيم.'
                  : 'Your updated credentials and profile photo synchronize directly. The corporate administrator maintains visibility of project user credentials to ensure continuous site governance.'}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving
                  ? isRTL
                    ? 'جاري الحفظ...'
                    : 'Saving...'
                  : isRTL
                  ? 'حفظ التغييرات'
                  : 'Save Profile Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
