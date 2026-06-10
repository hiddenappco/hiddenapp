import React, { useState, useEffect, useRef } from 'react';
import { Language, Theme } from '../types/core';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from './layout/AuthProvider';
import { useUserProfile, updateUserProfile as updateFirestoreProfile } from '../hooks/useFirestore';
import { uploadProfilePicture } from '../services/storageService';
import { COLOMBIA_LOCATIONS, COUNTRIES } from '../utils/locations';
import { ImageCropper } from './ui/ImageCropper';
import { useHardwareBackHandler } from '../hooks/useHardwareBackHandler';

interface ProfileSettingsProps {
  language: Language;
  onBack: () => void;
  onLogout: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ language: propLanguage, onBack, onLogout }) => {
  const { currentLanguage, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const language = currentLanguage;
  const { theme, setTheme } = useTheme();
  const { user, logout, updateUserProfile: updateAuthProfile } = useAuth();
  const { data: profile, loading: profileLoading } = useUserProfile(user?.uid);

  const [formData, setFormData] = useState({
    displayName: '',
    country: 'Colombia',
    department: '',
    city: '',
    bio: ''
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Cropper State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  useHardwareBackHandler(() => {
    if (showCropper) {
      setShowCropper(false);
      setSelectedImage(null);
      return true;
    }
    return false;
  }, [showCropper]);

  // Sync form with profile data when loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || user?.displayName || '',
        country: profile.country || 'Colombia',
        department: profile.department || '',
        city: profile.city || '',
        bio: profile.bio || ''
      });
    }
  }, [profile, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        if (typeof reader.result === 'string') {
          setSelectedImage(reader.result);
          setShowCropper(true);
        }
      });
      reader.readAsDataURL(file);
    }
    // Reset inputs value to allow selecting same file again
    e.target.value = '';
  };

  const handleApplyCrop = async (croppedBlob: Blob) => {
    if (!user) return;
    setShowCropper(false);

    try {
      setUploading(true);
      // Upload blob to storage
      const photoURL = await uploadProfilePicture(user.uid, croppedBlob);

      // Update both Auth and Firestore immediately
      await updateAuthProfile(formData.displayName, photoURL);
      await updateFirestoreProfile(user.uid, { photoURL });

      // Clean up
      setSelectedImage(null);
      alert(t('settings.photoSuccess'));
    } catch (err) {
      console.error("Error uploading cropped photo:", err);
      alert(t('settings.photoError'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      // Update both Auth and Firestore
      await updateAuthProfile(formData.displayName);
      await updateFirestoreProfile(user.uid, formData);
      alert(t('settings.saveSuccess'));
    } catch (err) {
      console.error("Error saving profile:", err);
      alert(t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    const confirmMsg = t('settings.deleteConfirm');

    if (window.confirm(confirmMsg)) {
      alert(t('settings.supportContact'));
    }
  };

  const texts = {
    title: t('settings.title'),
    changePhoto: t('settings.changePhoto'),
    personalInfo: t('settings.personalInfo'),
    username: t('settings.username'),
    email: t('settings.email'),
    location: t('settings.location'),
    country: t('settings.country'),
    department: t('settings.department'),
    city: t('settings.city'),
    bio: t('settings.bio'),
    security: t('settings.appearance'),
    save: t('settings.save'),
    saving: t('settings.saving'),
    logout: t('settings.logout'),
    delete: t('settings.deleteAccount')
  };

  const departments = Object.keys(COLOMBIA_LOCATIONS);
  const cities = formData.department ? COLOMBIA_LOCATIONS[formData.department] : [];

  // Current display photo: priority to Firestore profile which is reactive
  const currentPhoto = profile?.photoURL || user?.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

  if (profileLoading) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content-subtle">{t('common.loading')}</div>;

  return (
    <>
      <div className="bg-background-dark font-display text-content antialiased h-screen w-full flex flex-col overflow-hidden relative z-50">
        <header className="sticky top-0 z-10 bg-background-dark/95 backdrop-blur-sm border-b border-overlay/5 transition-colors shrink-0">
          <div className="flex items-center justify-between p-4 pb-3 pt-safe-hero">
            <button
              onClick={onBack}
              className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors text-content"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
            </button>
            <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center text-content">{texts.title}</h2>
            <div className="flex size-10 shrink-0 items-center justify-center">
              {saving ? (
                <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px]">cloud_done</span>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
          <div className="flex flex-col items-center gap-4 pt-6 pb-2">
            <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
              <div className={`bg-center bg-no-repeat bg-cover rounded-full size-28 border-4 border-white dark:border-background-dark shadow-lg transition-opacity ${uploading ? 'opacity-50' : ''}`}
                style={{ backgroundImage: `url("${currentPhoto}")` }}>
              </div>
              <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 border-2 border-white dark:border-background-dark shadow-md flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">{uploading ? 'sync' : 'edit'}</span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handlePhotoSelect}
              />
            </div>
            <p className="text-primary font-bold text-sm cursor-pointer" onClick={handlePhotoClick}>
              {uploading ? t('common.uploading') : texts.changePhoto}
            </p>
          </div>

          <form className="flex flex-col w-full px-5 pb-8 gap-6">
            <div>
              <h3 className="text-xl font-bold mb-4 text-content">{texts.personalInfo}</h3>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col w-full gap-1.5">
                  <span className="text-sm font-medium text-content-muted">{texts.username}</span>
                  <input
                    className="w-full rounded-xl border border-overlay/10 bg-surface-dark text-content focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4 font-medium"
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                  />
                </label>
                <label className="flex flex-col w-full gap-1.5">
                  <span className="text-sm font-medium text-content-muted">{texts.email}</span>
                  <input
                    className="w-full rounded-xl border border-overlay/5 bg-background-dark text-content-subtle h-12 px-4 font-medium cursor-not-allowed"
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                </label>
                <label className="flex flex-col w-full gap-1.5">
                  <span className="text-sm font-medium text-content-muted">{texts.bio}</span>
                  <textarea
                    className="w-full rounded-xl border border-overlay/10 bg-surface-dark text-content focus:outline-none focus:ring-2 focus:ring-primary/50 p-4 font-medium min-h-[100px]"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder={t('settings.bioPlaceholder')}
                  />
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4 text-content">{texts.location}</h3>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col w-full gap-1.5">
                  <span className="text-sm font-medium text-content-muted">{texts.country}</span>
                  <div className="relative">
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full appearance-none rounded-xl border border-overlay/10 bg-surface-dark text-content focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4 pr-10 font-medium cursor-pointer"
                    >
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none">expand_more</span>
                  </div>
                </label>

                {formData.country === 'Colombia' && (
                  <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="flex flex-col w-1/2 gap-1.5">
                      <span className="text-sm font-medium text-content-muted">{texts.department}</span>
                      <div className="relative">
                        <select
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          className="w-full appearance-none rounded-xl border border-overlay/10 bg-surface-dark text-content focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4 pr-8 font-medium cursor-pointer"
                        >
                          <option value="">{t('common.select')}</option>
                          {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none">expand_more</span>
                      </div>
                    </label>
                    <label className="flex flex-col w-1/2 gap-1.5">
                      <span className="text-sm font-medium text-content-muted">{texts.city}</span>
                      <div className="relative">
                        <select
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full appearance-none rounded-xl border border-overlay/10 bg-surface-dark text-content focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4 pr-8 font-medium cursor-pointer"
                          disabled={!formData.department}
                        >
                          <option value="">{t('common.select')}</option>
                          {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none">expand_more</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4 text-content">{t('settings.appearance')}</h3>
              <div className="flex bg-surface-dark border border-overlay/10 rounded-2xl p-1.5 w-full relative">
                {/* Slidable background */}
                <div 
                  className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-primary rounded-xl transition-all duration-300 ease-out transform ${
                    theme === Theme.Light ? 'translate-x-0' : 'translate-x-full'
                  }`}
                />
                
                <button
                  type="button"
                  onClick={() => setTheme(Theme.Light)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm z-10 transition-colors duration-300 ${
                    theme === Theme.Light ? 'text-content' : 'text-content-secondary hover:text-content'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">light_mode</span>
                  <span>{t('settings.themeLight')}</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setTheme(Theme.Dark)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm z-10 transition-colors duration-300 ${
                    theme === Theme.Dark ? 'text-content' : 'text-content-secondary hover:text-content'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                  <span>{t('settings.themeDark')}</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4 text-content">{t('settings.language')}</h3>
              <div className="flex bg-surface-dark border border-overlay/10 rounded-2xl p-1.5 w-full relative">
                {/* Slidable background */}
                <div 
                  className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-primary rounded-xl transition-all duration-300 ease-out transform ${
                    currentLanguage === Language.Spanish ? 'translate-x-0' : 'translate-x-full'
                  }`}
                />
                
                <button
                  type="button"
                  onClick={() => setLanguage(Language.Spanish)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm z-10 transition-colors duration-300 ${
                    currentLanguage === Language.Spanish ? 'text-content' : 'text-content-secondary hover:text-content'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">language</span>
                  <span>Español</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setLanguage(Language.English)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm z-10 transition-colors duration-300 ${
                    currentLanguage === Language.English ? 'text-content' : 'text-content-secondary hover:text-content'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">language</span>
                  <span>English</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-bold h-14 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                type="button"
              >
                <span>{saving ? texts.saving : texts.save}</span>
                {!saving && <span className="material-symbols-outlined">check_circle</span>}
              </button>

              <div className="flex flex-col gap-3 pt-4 border-t border-overlay/5">
                <button
                  onClick={onLogout}
                  className="w-full text-content-secondary hover:bg-overlay/5 font-medium h-12 rounded-xl transition-colors flex items-center justify-center gap-2"
                  type="button"
                >
                  <span className="material-symbols-outlined">logout</span>
                  <span>{texts.logout}</span>
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full text-red-500 hover:bg-red-900/10 font-medium text-sm h-10 rounded-xl transition-colors"
                  type="button"
                >
                  {texts.delete}
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>

      {showCropper && selectedImage && (
        <ImageCropper
          imageSrc={selectedImage}
          onCancel={() => { setShowCropper(false); setSelectedImage(null); }}
          onCropComplete={handleApplyCrop}
        />
      )}
    </>
  );
};