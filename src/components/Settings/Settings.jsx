import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  FileImage, 
  Upload, 
  CreditCard,
  Save,
  HelpCircle,
  Plus,
  Trash2,
  Star,
  Check
} from 'lucide-react';

export const Settings = () => {
  const { 
    settings, 
    profiles, 
    addProfile, 
    updateProfile, 
    deleteProfile, 
    setDefaultProfile, 
    uploadLogo, 
    loadingStates,
    confirm,
    showToast
  } = useApp();

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Synchronize form values with selected profile
  useEffect(() => {
    if (isCreating) {
      setCompanyName('');
      setGstNumber('');
      setEmail('');
      setPhone('');
      setWebsite('');
      setAddress('');
      setLogoUrl('');
    } else {
      const activeProfile = profiles.find(p => p.id === selectedProfileId) || profiles.find(p => p.is_default) || settings;
      if (activeProfile) {
        setSelectedProfileId(activeProfile.id);
        setCompanyName(activeProfile.company_name || '');
        setGstNumber(activeProfile.gst_number || '');
        setEmail(activeProfile.email || '');
        setPhone(activeProfile.phone || '');
        setWebsite(activeProfile.website || '');
        setAddress(activeProfile.address || '');
        setLogoUrl(activeProfile.logo_url || '');
      }
    }
  }, [selectedProfileId, profiles, isCreating, settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      company_name: companyName,
      gst_number: gstNumber,
      email,
      phone,
      website,
      address,
      logo_url: logoUrl
    };

    try {
      if (isCreating) {
        const created = await addProfile(payload);
        setIsCreating(false);
        setSelectedProfileId(created.id);
      } else {
        await updateProfile(selectedProfileId, payload);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProfile = async () => {
    const confirmed = await confirm({
      title: 'Delete Business Profile',
      message: 'Are you sure you want to delete this profile? This will not affect existing invoices, but the profile will no longer be selectable.',
      type: 'danger',
      confirmText: 'Delete Profile',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        await deleteProfile(selectedProfileId);
        setIsCreating(false);
        const defaultProf = profiles.find(p => p.is_default);
        setSelectedProfileId(defaultProf?.id || 'default-profile');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSetDefault = async () => {
    try {
      await setDefaultProfile(selectedProfileId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG/JPG)', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo size must be less than 2MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadLogo(file, isCreating ? 'new-profile' : selectedProfileId);
      setLogoUrl(publicUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const currentActiveProfile = profiles.find(p => p.id === selectedProfileId) || {};

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      
      {/* Sidebar: Profiles List */}
      <div className="xl:col-span-1 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 transition-colors shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary-500" />
              Profiles
            </h3>
            <button
              onClick={() => setIsCreating(true)}
              className="p-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/30 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-lg transition-colors"
              title="Add Business Profile"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-[400px] xl:max-h-none overflow-y-auto pr-1">
            {profiles.map((p) => {
              const isActive = !isCreating && selectedProfileId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedProfileId(p.id);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 relative group ${
                    isActive 
                      ? 'bg-primary-50/55 dark:bg-primary-950/20 border-primary-100 dark:border-primary-900/50' 
                      : 'bg-slate-50/20 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border-slate-100 dark:border-slate-800/80'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt={p.company_name} className="max-h-full max-w-full object-contain p-0.5" />
                    ) : (
                      <span className="font-bold text-xs text-slate-450 uppercase">
                        {p.company_name?.charAt(0)}
                      </span>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-grow pr-4">
                    <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate leading-tight">
                      {p.company_name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                      {p.gst_number || 'No GSTIN'}
                    </p>
                  </div>

                  {p.is_default && (
                    <span className="absolute top-2 right-2 text-amber-500" title="Default Billing Profile">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Workspace: Profile Editor */}
      <div className="xl:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form configuration column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-500" />
                <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">
                  {isCreating ? 'Create Business Profile' : 'Profile Information'}
                </h3>
              </div>
              {!isCreating && currentActiveProfile.is_default && (
                <span className="flex items-center gap-1 py-1 px-2.5 bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-450 rounded-lg text-xs font-semibold">
                  <Star className="w-3 h-3 fill-amber-600 dark:fill-amber-450" /> Default Profile
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Company / Brand Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Tech Solutions"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    GSTIN Registration Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. 27AADCA1123B1Z2"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Billing Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      placeholder="billing@acme.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Phone Hotline
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="+91 22 2345 6789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Website URL
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Globe className="w-4 h-4" />
                    </span>
                    <input
                      type="url"
                      placeholder="https://acme.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Corporate Address
                </label>
                <div className="relative">
                  <span className="absolute top-2.5 left-3 text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <textarea
                    placeholder="Street address, Suite, City, State, ZIP Code"
                    rows="3"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex gap-2">
                  {!isCreating && !currentActiveProfile.is_default && (
                    <>
                      <button
                        type="button"
                        onClick={handleSetDefault}
                        className="flex items-center gap-1.5 py-2 px-4 border border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all active:scale-[0.98] text-xs shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Make Default
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleDeleteProfile}
                        className="flex items-center gap-1.5 py-2 px-4 border border-rose-200 dark:border-rose-950/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-450 font-semibold rounded-xl transition-all active:scale-[0.98] text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Profile
                      </button>
                    </>
                  )}
                  {isCreating && (
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="py-2 px-4 border border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-405 font-semibold rounded-xl transition-all active:scale-[0.98] text-xs"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loadingStates.settings}
                  className="flex items-center gap-2 py-2.5 px-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] text-sm"
                >
                  <Save className="w-4 h-4" /> 
                  {isCreating ? 'Create Profile' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Logo & Info column */}
        <div className="space-y-6">
          
          {/* Logo Upload Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <FileImage className="w-5 h-5 text-primary-500" />
              <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">Corporate Identity</h3>
            </div>

            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative w-36 h-36 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden mb-4 group shadow-inner">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Company Logo Preview" 
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-650" />
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-xs">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>

              <div className="w-full">
                <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-200 font-semibold rounded-xl cursor-pointer transition-colors text-xs shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>Upload JPEG or PNG Logo</span>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/jpg" 
                    onChange={handleLogoUpload} 
                    className="hidden" 
                  />
                </label>
                <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
                  Recommending landscape aspect ratios. Image files are stored in public Supabase Storage buckets. Max file size: 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Supabase Storage Setup Help Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <HelpCircle className="w-4.5 h-4.5 text-primary-500" />
              <h3 className="font-display font-semibold text-sm text-slate-800 dark:text-white">Developer Configuration</h3>
            </div>
            
            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <p>To enable logo uploads, complete these settings in your Supabase dashboard:</p>
              <ol className="list-decimal pl-4 space-y-1.5">
                <li>Navigate to <strong>Storage</strong>.</li>
                <li>Create a new bucket named exactly <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-primary-600 font-mono rounded">logos</code>.</li>
                <li>Set bucket visibility toggle to <strong>Public</strong>.</li>
                <li>Add a bucket security policy:
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-400">
                    <li>Allow <strong>Insert</strong>, <strong>Select</strong> and <strong>Update</strong> operations for all users.</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
