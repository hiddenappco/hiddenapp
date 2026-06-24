import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from './layout/AuthProvider';
import { useUserProfile, updateUserProfile as updateFirestoreProfile } from '../hooks/useFirestore';
import { uploadProfilePicture } from '../services/storageService';
import { COLOMBIA_LOCATIONS, COUNTRIES } from '../utils/locations';
import { ImageCropper } from './ui/ImageCropper';
import { useHardwareBackHandler } from '../hooks/useHardwareBackHandler';
import { GuestAccountUpgrade } from './profile/GuestAccountUpgrade';
import { isGuestProfile } from '../utils/userIdentity';
import { SettingsScreenShell } from './settings/SettingsScreenShell';

interface ProfileSettingsProps {
  language: Language;
  onBack: () => void;
  onLogout: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onBack, onLogout }) => {
  const { t } = useTranslation();
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
  const [guestUpgradeDone, setGuestUpgradeDone] = useState(false);

  const needsGuestUpgrade =
    !guestUpgradeDone && (user?.isAnonymous === true || isGuestProfile(profile));

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
    e.target.value = '';
  };

  const handleApplyCrop = async (croppedBlob: Blob) => {
    if (!user) return;
    setShowCropper(false);

    try {
      setUploading(true);
      const photoURL = await uploadProfilePicture(user.uid, croppedBlob);
      await updateAuthProfile(formData.displayName, photoURL);
      await updateFirestoreProfile(user.uid, { photoURL });
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
    if (window.confirm(t('settings.deleteConfirm'))) {
      alert(t('settings.supportContact'));
    }
  };

  const departments = Object.keys(COLOMBIA_LOCATIONS);
  const cities = formData.department ? COLOMBIA_LOCATIONS[formData.department] : [];
  const currentPhoto = profile?.photoURL || user?.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

  if (profileLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content-subtle">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <>
      <SettingsScreenShell
        title={t('settings.profile.title')}
        onBack={onBack}
        headerRight={
          saving ? (
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px]">cloud_done</span>
          )
        }
      >
        <div className="flex flex-col items-center gap-4 pt-6 pb-2">
          <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
            <div
              className={`bg-center bg-no-repeat bg-cover rounded-full size-28 border-4 border-white dark:border-background-dark shadow-lg transition-opacity ${uploading ? 'opacity-50' : ''}`}
              style={{ backgroundImage: `url("${currentPhoto}")` }}
            />
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
            {uploading ? t('common.uploading') : t('settings.changePhoto')}
          </p>
        </div>

        <form className="flex flex-col w-full px-5 pb-8 gap-6">
          {guestUpgradeDone ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex gap-3 items-start">
              <span className="material-symbols-outlined text-emerald-400 text-[22px] shrink-0">verified_user</span>
              <div>
                <p className="text-sm font-bold text-content">{t('settings.guestUpgrade.successTitle')}</p>
                <p className="text-xs text-content-muted mt-1 leading-relaxed">
                  {t('settings.guestUpgrade.successBody')}
                </p>
              </div>
            </div>
          ) : null}

          {needsGuestUpgrade ? (
            <GuestAccountUpgrade onUpgraded={() => setGuestUpgradeDone(true)} />
          ) : null}

          <div>
            <h3 className="text-xl font-bold mb-4 text-content">{t('settings.personalInfo')}</h3>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col w-full gap-1.5">
                <span className="text-sm font-medium text-content-muted">{t('settings.username')}</span>
                <input
                  className="w-full rounded-xl border border-overlay/10 bg-surface-dark text-content focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4 font-medium"
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                />
              </label>
              <label className="flex flex-col w-full gap-1.5">
                <span className="text-sm font-medium text-content-muted">{t('settings.email')}</span>
                <input
                  className="w-full rounded-xl border border-overlay/5 bg-background-dark text-content-subtle h-12 px-4 font-medium cursor-not-allowed"
                  type="email"
                  value={user?.email || ''}
                  placeholder={needsGuestUpgrade ? t('settings.guestUpgrade.emailPending') : undefined}
                  disabled
                />
              </label>
              <label className="flex flex-col w-full gap-1.5">
                <span className="text-sm font-medium text-content-muted">{t('settings.bio')}</span>
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
            <h3 className="text-xl font-bold mb-4 text-content">{t('settings.location')}</h3>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col w-full gap-1.5">
                <span className="text-sm font-medium text-content-muted">{t('settings.country')}</span>
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
                    <span className="text-sm font-medium text-content-muted">{t('settings.department')}</span>
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
                    <span className="text-sm font-medium text-content-muted">{t('settings.city')}</span>
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

          <div className="flex flex-col gap-4 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-bold h-14 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              type="button"
            >
              <span>{saving ? t('settings.saving') : t('settings.save')}</span>
              {!saving && <span className="material-symbols-outlined">check_circle</span>}
            </button>

            <div className="flex flex-col gap-3 pt-4 border-t border-overlay/5">
              <button
                onClick={onLogout}
                className="w-full text-content-secondary hover:bg-overlay/5 font-medium h-12 rounded-xl transition-colors flex items-center justify-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined">logout</span>
                <span>{t('settings.logout')}</span>
              </button>
              <button
                onClick={handleDeleteAccount}
                className="w-full text-red-500 hover:bg-red-900/10 font-medium text-sm h-10 rounded-xl transition-colors"
                type="button"
              >
                {t('settings.deleteAccount')}
              </button>
            </div>
          </div>
        </form>
      </SettingsScreenShell>

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
