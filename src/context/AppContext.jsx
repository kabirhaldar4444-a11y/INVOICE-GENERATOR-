import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from './AuthContext';
import {
  getAllProfiles as idbGetAllProfiles,
  createProfile as idbCreateProfile,
  updateProfile as idbUpdateProfile,
  deleteProfile as idbDeleteProfile,
  setDefaultProfile as idbSetDefaultProfile,
} from '../utils/db';
import { ConfirmDialog } from '../components/Shared/ConfirmDialog';

const AppContext = createContext();

// Detect if Supabase is configured
const useSupabase = 
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY && 
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder');

export const AppProvider = ({ children }) => {
  const { user, isTrialMode } = useAuth();
  
  // Data States
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loadingStates, setLoadingStates] = useState({
    customers: false,
    invoices: false,
    settings: false,
  });

  // UI States
  const [toasts, setToasts] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [dialogState, setDialogState] = useState(null);

  // Dialog System
  const confirm = (options) => {
    return new Promise((resolve) => {
      setDialogState({
        title: options?.title || 'Confirm Action',
        message: options?.message || 'Are you sure you want to proceed?',
        type: options?.type || 'info',
        confirmText: options?.confirmText || 'Confirm',
        cancelText: options?.cancelText || 'Cancel',
        isAlert: false,
        resolve,
      });
    });
  };

  const alert = (options) => {
    const message = typeof options === 'string' ? options : (options?.message || '');
    const title = typeof options === 'string' ? 'Notice' : (options?.title || 'Notice');
    return new Promise((resolve) => {
      setDialogState({
        title,
        message,
        type: options?.type || 'info',
        confirmText: options?.confirmText || 'OK',
        cancelText: '',
        isAlert: true,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    if (dialogState && dialogState.resolve) {
      dialogState.resolve(true);
    }
    setDialogState(null);
  };

  const handleCancel = () => {
    if (dialogState && dialogState.resolve) {
      dialogState.resolve(false);
    }
    setDialogState(null);
  };

  // Initialize Theme (Force Premium White Light Mode)
  useEffect(() => {
    setDarkMode(false);
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  const toggleTheme = () => {
    // Disabled to enforce premium white theme
  };

  // Toast System
  const showToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch all user-specific data once authenticated
  useEffect(() => {
    if (user) {
      if (useSupabase) {
        fetchSettings();
        fetchCustomers();
        fetchInvoices();
      } else {
        // Load offline demo data from localStorage or seed with defaults
        fetchOfflineData();
      }
      // Always load company profiles from IndexedDB (permanent local storage)
      fetchProfiles();
    } else {
      setCustomers([]);
      setInvoices([]);
      setSettings(null);
      setProfiles([]);
    }
  }, [user, isTrialMode]);

  // SEED TRIAL/DEMO DATA
  const fetchOfflineData = () => {
    let localSettings = localStorage.getItem('invoisify_settings');
    
    // Clear old placeholder settings if present so that I-SUCCESSNODE details populate immediately
    if (localSettings && (localSettings.includes('Acme Enterprise Solutions') || localSettings.includes('My Company'))) {
      localStorage.removeItem('invoisify_settings');
      localStorage.removeItem('invoisify_customers');
      localStorage.removeItem('invoisify_invoices');
      localSettings = null;
    }

    // 1. Settings
    if (!localSettings) {
      const defaultSettings = {
        id: 'trial-user-id',
        company_name: 'I-SUCCESSNODE',
        gst_number: '09AAHCI9258G1Z3',
        email: 'support@isuccessnode.com',
        phone: '+91-7969537567',
        website: 'www.isuccessnode.com',
        address: 'I-SUCCESSNODE Office, India',
        logo_url: '/logo.svg'
      };
      localStorage.setItem('invoisify_settings', JSON.stringify(defaultSettings));
      setSettings(defaultSettings);
    } else {
      setSettings(JSON.parse(localSettings));
    }

    // 2. Customers
    let localCustomers = localStorage.getItem('invoisify_customers');
    let seedCustomers = [];
    if (!localCustomers) {
      seedCustomers = [
        {
          id: 'cust-1',
          name: 'Pratibha Manwar',
          email: 'manwarpratibha12@gmail.com',
          phone: '',
          gst_number: '',
          address: 'India'
        },
        {
          id: 'cust-2',
          name: 'Tata Consultancy Services',
          email: 'accounts@tcs.com',
          phone: '+91 22 6778 9999',
          gst_number: '27AAACT2234G1Z2',
          address: 'TCS House, Raveline Street, Fort, Mumbai, MH, 400001'
        }
      ];
      localStorage.setItem('invoisify_customers', JSON.stringify(seedCustomers));
      setCustomers(seedCustomers);
    } else {
      seedCustomers = JSON.parse(localCustomers);
      setCustomers(seedCustomers);
    }

    // 3. Invoices
    let localInvoices = localStorage.getItem('invoisify_invoices');
    if (!localInvoices) {
      const seedInvoices = [
        {
          id: 'inv-1',
          invoice_number: '2026/MCG/1903',
          customer_id: 'cust-1',
          invoice_date: '2026-06-03',
          subtotal: 83474.58,
          gst_amount: 15025.42,
          total_amount: 98500.00,
          paid_amount: 98500.00,
          status: 'paid',
          created_at: new Date('2026-06-03T10:00:00Z').toISOString(),
          customers: seedCustomers[0],
          invoice_items: [
            {
              id: 'item-1',
              invoice_id: 'inv-1',
              program_name: 'FAC',
              description: '',
              quantity: 1,
              unit_price: 41737.29,
              gst_percentage: 18,
              gst_amount: 7512.71,
              total_amount: 49250.00
            },
            {
              id: 'item-2',
              invoice_id: 'inv-1',
              program_name: 'FRMC',
              description: '',
              quantity: 1,
              unit_price: 41737.29,
              gst_percentage: 18,
              gst_amount: 7512.71,
              total_amount: 49250.00
            },
            {
              id: 'item-3',
              invoice_id: 'inv-1',
              program_name: 'FMVAC\n(Complementary)',
              description: '',
              quantity: 1,
              unit_price: 0.00,
              gst_percentage: 0,
              gst_amount: 0.00,
              total_amount: 0.00
            }
          ]
        }
      ];
      localStorage.setItem('invoisify_invoices', JSON.stringify(seedInvoices));
      setInvoices(seedInvoices);
    } else {
      const rawInvoices = JSON.parse(localInvoices);
      const processed = rawInvoices.map(inv => {
        const profileItem = inv.invoice_items?.find(item => item.program_name === '__profile_metadata__');
        let invoiceProfile = null;
        if (profileItem) {
          try {
            invoiceProfile = JSON.parse(profileItem.description);
          } catch (e) {
            console.error("Failed to parse invoice profile metadata", e);
          }
        }
        return {
          ...inv,
          invoice_profile: invoiceProfile,
          invoice_items: inv.invoice_items?.filter(item => item.program_name !== '__profile_metadata__') || []
        };
      });
      setInvoices(processed);
    }
  };

  // COMPANY SETTINGS API
  const fetchSettings = async () => {
    if (!user) return;
    setLoadingStates(prev => ({ ...prev, settings: true }));
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newRow, error: insertError } = await supabase
            .from('company_settings')
            .insert({ id: user.id, company_name: 'My Company', email: user.email })
            .select()
            .single();
          if (!insertError) setSettings(newRow);
        } else {
          console.error("Error fetching settings:", error);
        }
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStates(prev => ({ ...prev, settings: false }));
    }
  };

  const updateSettings = async (updatedFields) => {
    if (!user) return;
    setLoadingStates(prev => ({ ...prev, settings: true }));
    try {
      if (useSupabase) {
        // Supabase Database Update
        const { data, error } = await supabase
          .from('company_settings')
          .update({ ...updatedFields, updated_at: new Date() })
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      } else {
        // Trial Mode Local Update
        const newSettings = { ...settings, ...updatedFields };
        localStorage.setItem('invoisify_settings', JSON.stringify(newSettings));
        setSettings(newSettings);
      }
      showToast('Company settings updated successfully', 'success');
      return settings;
    } catch (err) {
      showToast(err.message || 'Failed to update settings', 'error');
      throw err;
    } finally {
      setLoadingStates(prev => ({ ...prev, settings: false }));
    }
  };

  // ── COMPANY PROFILES (IndexedDB — permanent local storage) ────  // ── Hardcoded master company list (always visible on every device/browser) ─
  // Each entry has a stable `id` so re-seeds are idempotent (won't duplicate).
  const HARDCODED_COMPANIES = [
    {
      id: 'hc-isn',
      company_name: 'I-SUCCESSNODE',
      gst_number: '09AAHCI9258G1Z3',
      email: 'support@isuccessnode.com',
      phone: '+91-7969537567',
      website: 'www.isuccessnode.com',
      address: 'I-SUCCESSNODE Office, India',
      logo_url: '/logo-isn.png',
      is_default: true,
    },
    {
      id: 'hc-elite',
      company_name: 'EliteToolistic',
      gst_number: '09AAOCP5868J1ZI',
      email: 'info@elitetoolistic.com',
      phone: '+91-7969325899',
      website: 'www.elitetoolistic.com',
      address: '301, 2nd Floor, The Capital, Science City Road, Sola, Ahmedabad - 380060',
      logo_url: '/logo-elite.png',
      is_default: false,
    },
    {
      id: 'hc-harvard',
      company_name: 'Harvard Learning',
      gst_number: '09AAOCP5868J1ZI',
      email: 'support@harvardlearning.com',
      phone: '+91-7969325899',
      website: 'www.harvardlearning.com',
      address: 'SG Highway, Bodakdev, Ahmedabad, Gujarat - 380054, India',
      logo_url: '/logo-harvard.png',
      is_default: false,
    },
    {
      id: 'hc-princeton',
      company_name: 'Princeton Professionals',
      gst_number: '09AAOCP5868J1ZI',
      email: 'support@princetonprofessional.com',
      phone: '+91-7969325899',
      website: 'www.princetonprofessional.com',
      address: '1203, Mondeal Heights, Sarkhej Gandhinagar Service Road, Near Wide Angle Cinema, Ramdevnagar, Satellite, Ahmedabad, Gujarat 380015',
      logo_url: '/logo-princeton.png',
      is_default: false,
    },
    {
      id: 'hc-pmis',
      company_name: 'PMI Services',
      gst_number: '09TRFPS5497N1Z6',
      email: 'support@pmiservices.in',
      phone: '+91-7969325899',
      website: 'www.pmiservices.in',
      address: 'Sarkhej Gandhinagar Service Road, Near Wide Angle Cinema, Ramdevnagar, Satellite, Ahmedabad, Gujarat 380015',
      logo_url: '/logo-pmi.jpg',
      is_default: false,
    },
  ];

  /**
   * Load all profiles from IndexedDB.
   * Hardcoded companies are always seeded/updated on every load so they
   * appear on every device/browser automatically.
   * User-created profiles are preserved alongside them.
   */
  const fetchProfiles = async () => {
    try {
      let stored = await idbGetAllProfiles();

      // ── Step 1: Remove stale auto-generated duplicates ─────────────────────
      // Old sessions may have seeded profiles with generated ids like
      // "prof-default-XXXX" or "trial-user-id" that duplicate hardcoded entries.
      // Remove them so only the canonical hardcoded ids remain.
      const hardcodedIds = new Set(HARDCODED_COMPANIES.map(c => c.id));
      const staleIds = stored
        .filter(p => !hardcodedIds.has(p.id) && (
          p.id?.startsWith('prof-default-') ||
          p.id === 'trial-user-id' ||
          p.id === 'default-profile'
        ))
        .map(p => p.id);

      for (const staleId of staleIds) {
        await idbDeleteProfile(staleId);
      }

      if (staleIds.length > 0) {
        stored = await idbGetAllProfiles();
      }

      // ── Step 2: Upsert each hardcoded company (add if missing) ─────────────
      const storedIds = new Set(stored.map(p => p.id));
      const now = new Date().toISOString();

      for (const company of HARDCODED_COMPANIES) {
        if (!storedIds.has(company.id)) {
          // Brand new hardcoded company — insert it
          await idbCreateProfile({ ...company, created_at: now, updated_at: now });
        } else {
          // Already exists — only sync the logo_url if it changed (leave other user edits intact)
          const existing = stored.find(p => p.id === company.id);
          if (existing && existing.logo_url !== company.logo_url) {
            await idbUpdateProfile(company.id, { logo_url: company.logo_url });
          }
        }
      }

      // ── Step 3: Migrate old localStorage extra profiles (first run only) ───
      if (stored.length === 0) {
        const extraRaw = localStorage.getItem('invoisify_company_profiles');
        if (extraRaw) {
          try {
            const extras = JSON.parse(extraRaw);
            for (const extra of extras) {
              if (!HARDCODED_COMPANIES.find(hc => hc.id === extra.id)) {
                await idbCreateProfile({ ...extra, is_default: false });
              }
            }
            localStorage.removeItem('invoisify_company_profiles');
          } catch (e) { /* ignore */ }
        }
      }

      stored = await idbGetAllProfiles();
      setProfiles(stored);
    } catch (err) {
      console.error('fetchProfiles (IndexedDB) error:', err);
    }
  };


  const addProfile = async (profileFields) => {
    try {
      const newProfile = await idbCreateProfile({ ...profileFields, is_default: false });
      setProfiles(prev => [...prev, newProfile]);
      showToast('Company profile added successfully', 'success');
      return newProfile;
    } catch (err) {
      showToast(err.message || 'Failed to add profile', 'error');
      throw err;
    }
  };

  const updateProfile = async (id, updatedFields) => {
    try {
      // If updating the default profile, also sync the main settings
      const target = profiles.find(p => p.id === id);
      if (target?.is_default) {
        await updateSettings(updatedFields);
      }
      const updated = await idbUpdateProfile(id, updatedFields);
      setProfiles(prev => prev.map(p => p.id === id ? updated : p));
      showToast('Company profile updated successfully', 'success');
      return updated;
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
      throw err;
    }
  };

  const deleteProfile = async (id) => {
    try {
      const target = profiles.find(p => p.id === id);
      if (target?.is_default) {
        throw new Error('Cannot delete the default company profile.');
      }
      await idbDeleteProfile(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
      showToast('Company profile deleted successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete profile', 'error');
      throw err;
    }
  };

  const setDefaultProfile = async (id) => {
    try {
      const target = profiles.find(p => p.id === id);
      if (!target) throw new Error('Profile not found');
      if (target.is_default) return; // Already default

      // Update IndexedDB — sets is_default on target, clears all others
      const updatedAll = await idbSetDefaultProfile(id);

      // Also sync the main settings with the new default's fields
      await updateSettings({
        company_name: target.company_name,
        gst_number:   target.gst_number,
        email:        target.email,
        phone:        target.phone,
        website:      target.website,
        address:      target.address,
        logo_url:     target.logo_url,
      });

      setProfiles(updatedAll);
      showToast(`"${target.company_name}" set as default profile`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to set default profile', 'error');
      throw err;
    }
  };

  // Upload Logo to Supabase Storage (or base64 offline)
  const uploadLogo = async (file, profileId = null) => {
    if (!user) return;
    setLoadingStates(prev => ({ ...prev, settings: true }));
    
    try {
      if (useSupabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);

        if (profileId && profileId !== (settings?.id || 'default-profile')) {
          // Persist logo_url to IndexedDB for the specific profile
          await idbUpdateProfile(profileId, { logo_url: publicUrl });
          setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, logo_url: publicUrl } : p));
          return publicUrl;
        }

        await updateSettings({ logo_url: publicUrl });
        // Also persist to IndexedDB default profile
        const defaultProf = profiles.find(p => p.is_default);
        if (defaultProf) {
          await idbUpdateProfile(defaultProf.id, { logo_url: publicUrl });
          setProfiles(prev => prev.map(p => p.is_default ? { ...p, logo_url: publicUrl } : p));
        }
        return publicUrl;
      } else {
        // Offline: convert to base64 and save to IndexedDB
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Url = reader.result;
              if (profileId) {
                // Save logo to the specific profile in IndexedDB
                await idbUpdateProfile(profileId, { logo_url: base64Url });
                setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, logo_url: base64Url } : p));
              } else {
                // Save logo to the default profile in IndexedDB
                const defaultProf = profiles.find(p => p.is_default);
                if (defaultProf) {
                  await idbUpdateProfile(defaultProf.id, { logo_url: base64Url });
                  setProfiles(prev => prev.map(p => p.is_default ? { ...p, logo_url: base64Url } : p));
                }
                await updateSettings({ logo_url: base64Url });
              }
              resolve(base64Url);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => {
            reject(new Error('Failed to parse file.'));
          };
          reader.readAsDataURL(file);
        });
      }
    } catch (err) {
      showToast(err.message || 'Failed to upload logo', 'error');
      throw err;
    } finally {
      setLoadingStates(prev => ({ ...prev, settings: false }));
    }
  };

  // CUSTOMERS API
  const fetchCustomers = async () => {
    if (!user) return;
    setLoadingStates(prev => ({ ...prev, customers: true }));
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoadingStates(prev => ({ ...prev, customers: false }));
    }
  };

  const addCustomer = async (customerFields) => {
    if (!user) return;
    try {
      if (useSupabase) {
        const { data, error } = await supabase
          .from('customers')
          .insert({ ...customerFields, user_id: user.id })
          .select()
          .single();

        if (error) throw error;
        setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('Customer added successfully', 'success');
        return data;
      } else {
        // Trial Mode customer insert
        const newCustomer = {
          id: `cust-${Date.now()}`,
          ...customerFields
        };
        const updated = [...customers, newCustomer].sort((a, b) => a.name.localeCompare(b.name));
        localStorage.setItem('invoisify_customers', JSON.stringify(updated));
        setCustomers(updated);
        showToast('Customer added successfully (Trial Mode)', 'success');
        return newCustomer;
      }
    } catch (err) {
      showToast(err.message || 'Failed to add customer', 'error');
      throw err;
    }
  };

  const updateCustomer = async (id, customerFields) => {
    if (!user) return;
    try {
      if (useSupabase) {
        const { data, error } = await supabase
          .from('customers')
          .update(customerFields)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        setCustomers(prev => prev.map(c => c.id === id ? data : c).sort((a, b) => a.name.localeCompare(b.name)));
        setInvoices(prev => prev.map(inv => inv.customer_id === id ? { ...inv, customers: data } : inv));
        showToast('Customer updated successfully', 'success');
        return data;
      } else {
        // Trial Mode update
        const currentCustomer = customers.find(c => c.id === id);
        const updatedCustomer = { ...currentCustomer, ...customerFields };
        const updatedCustomers = customers.map(c => c.id === id ? updatedCustomer : c).sort((a, b) => a.name.localeCompare(b.name));
        
        localStorage.setItem('invoisify_customers', JSON.stringify(updatedCustomers));
        setCustomers(updatedCustomers);
        
        // Also update local invoices customer metadata reference
        const updatedInvoices = invoices.map(inv => {
          if (inv.customer_id === id) {
            return { ...inv, customers: updatedCustomer };
          }
          return inv;
        });
        localStorage.setItem('invoisify_invoices', JSON.stringify(updatedInvoices));
        setInvoices(updatedInvoices);

        showToast('Customer updated successfully (Trial Mode)', 'success');
        return updatedCustomer;
      }
    } catch (err) {
      showToast(err.message || 'Failed to update customer', 'error');
      throw err;
    }
  };

  const deleteCustomer = async (id) => {
    if (!user) return;
    try {
      const hasInvoices = invoices.some(inv => inv.customer_id === id);
      if (hasInvoices) {
        throw new Error('Cannot delete customer with active invoices. Delete the invoices first.');
      }

      if (useSupabase) {
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }
      
      const filtered = customers.filter(c => c.id !== id);
      if (!useSupabase) {
        localStorage.setItem('invoisify_customers', JSON.stringify(filtered));
      }
      setCustomers(filtered);
      showToast('Customer deleted successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete customer', 'error');
      throw err;
    }
  };

  // INVOICES API
  const fetchInvoices = async () => {
    if (!user) return;
    setLoadingStates(prev => ({ ...prev, invoices: true }));
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(*), invoice_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const processed = (data || []).map(inv => {
        const profileItem = inv.invoice_items?.find(item => item.program_name === '__profile_metadata__');
        let invoiceProfile = null;
        if (profileItem) {
          try {
            invoiceProfile = JSON.parse(profileItem.description);
          } catch (e) {
            console.error("Failed to parse invoice profile metadata", e);
          }
        }
        return {
          ...inv,
          invoice_profile: invoiceProfile,
          invoice_items: inv.invoice_items?.filter(item => item.program_name !== '__profile_metadata__') || []
        };
      });

      setInvoices(processed);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoadingStates(prev => ({ ...prev, invoices: false }));
    }
  };

  const addInvoice = async (invoiceFields, items) => {
    if (!user) return;
    try {
      if (useSupabase) {
        const { data: inv, error: invError } = await supabase
          .from('invoices')
          .insert({
            user_id: user.id,
            invoice_number: invoiceFields.invoice_number,
            customer_id: invoiceFields.customer_id,
            invoice_date: invoiceFields.invoice_date,
            subtotal: invoiceFields.subtotal,
            gst_amount: invoiceFields.gst_amount,
            total_amount: invoiceFields.total_amount,
            paid_amount: invoiceFields.paid_amount,
            status: invoiceFields.status
          })
          .select()
          .single();

        if (invError) {
          if (invError.code === '23505') {
            throw new Error(`Invoice number "${invoiceFields.invoice_number}" already exists.`);
          }
          throw invError;
        }

        const formattedItems = items.map(item => ({
          invoice_id: inv.id,
          program_name: item.program_name,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          gst_percentage: item.gst_percentage,
          gst_amount: item.gst_amount,
          total_amount: item.total_amount
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from('invoice_items')
          .insert(formattedItems)
          .select();

        if (itemsError) {
          await supabase.from('invoices').delete().eq('id', inv.id);
          throw itemsError;
        }

        const customer = customers.find(c => c.id === invoiceFields.customer_id);
        
        const profileItem = insertedItems.find(item => item.program_name === '__profile_metadata__');
        let invoiceProfile = null;
        if (profileItem) {
          try {
            invoiceProfile = JSON.parse(profileItem.description);
          } catch (e) {
            console.error(e);
          }
        }

        const fullInvoice = {
          ...inv,
          customers: customer,
          invoice_profile: invoiceProfile,
          invoice_items: insertedItems.filter(item => item.program_name !== '__profile_metadata__')
        };

        setInvoices(prev => [fullInvoice, ...prev]);
        showToast('Invoice created successfully', 'success');
        return fullInvoice;
      } else {
        // Trial Mode Invoice Insertion
        const isDuplicate = invoices.some(i => i.invoice_number === invoiceFields.invoice_number);
        if (isDuplicate) {
          throw new Error(`Invoice number "${invoiceFields.invoice_number}" already exists.`);
        }

        const newInvoiceId = `inv-${Date.now()}`;
        const customer = customers.find(c => c.id === invoiceFields.customer_id);

        const newItems = items.map((item, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          invoice_id: newInvoiceId,
          ...item
        }));

        const newInvoice = {
          id: newInvoiceId,
          user_id: 'trial-user-id',
          invoice_number: invoiceFields.invoice_number,
          customer_id: invoiceFields.customer_id,
          invoice_date: invoiceFields.invoice_date,
          subtotal: invoiceFields.subtotal,
          gst_amount: invoiceFields.gst_amount,
          total_amount: invoiceFields.total_amount,
          paid_amount: invoiceFields.paid_amount,
          status: invoiceFields.status,
          created_at: new Date().toISOString(),
          customers: customer,
          invoice_items: newItems
        };

        const rawInvoices = JSON.parse(localStorage.getItem('invoisify_invoices') || '[]');
        const updated = [newInvoice, ...rawInvoices];
        localStorage.setItem('invoisify_invoices', JSON.stringify(updated));

        // Process for React state
        const profileItem = newItems.find(item => item.program_name === '__profile_metadata__');
        let invoiceProfile = null;
        if (profileItem) {
          try {
            invoiceProfile = JSON.parse(profileItem.description);
          } catch (e) {
            console.error(e);
          }
        }

        const processedInvoice = {
          ...newInvoice,
          invoice_profile: invoiceProfile,
          invoice_items: newItems.filter(item => item.program_name !== '__profile_metadata__')
        };

        setInvoices(prev => [processedInvoice, ...prev]);
        showToast('Invoice created successfully (Trial Mode)', 'success');
        return processedInvoice;
      }
    } catch (err) {
      showToast(err.message || 'Failed to create invoice', 'error');
      throw err;
    }
  };

  const updateInvoice = async (id, invoiceFields, items) => {
    if (!user) return;
    try {
      if (useSupabase) {
        const { data: inv, error: invError } = await supabase
          .from('invoices')
          .update({
            customer_id: invoiceFields.customer_id,
            invoice_date: invoiceFields.invoice_date,
            invoice_number: invoiceFields.invoice_number,
            subtotal: invoiceFields.subtotal,
            gst_amount: invoiceFields.gst_amount,
            total_amount: invoiceFields.total_amount,
            paid_amount: invoiceFields.paid_amount,
            status: invoiceFields.status
          })
          .eq('id', id)
          .select()
          .single();

        if (invError) throw invError;

        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);

        if (deleteError) throw deleteError;

        const formattedItems = items.map(item => ({
          invoice_id: id,
          program_name: item.program_name,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          gst_percentage: item.gst_percentage,
          gst_amount: item.gst_amount,
          total_amount: item.total_amount
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from('invoice_items')
          .insert(formattedItems)
          .select();

        if (itemsError) throw itemsError;

        const customer = customers.find(c => c.id === invoiceFields.customer_id);
        
        const profileItem = insertedItems.find(item => item.program_name === '__profile_metadata__');
        let invoiceProfile = null;
        if (profileItem) {
          try {
            invoiceProfile = JSON.parse(profileItem.description);
          } catch (e) {
            console.error(e);
          }
        }

        const fullInvoice = {
          ...inv,
          customers: customer,
          invoice_profile: invoiceProfile,
          invoice_items: insertedItems.filter(item => item.program_name !== '__profile_metadata__')
        };

        setInvoices(prev => prev.map(i => i.id === id ? fullInvoice : i));
        showToast('Invoice updated successfully', 'success');
        return fullInvoice;
      } else {
        // Trial Mode Invoice Edit
        const customer = customers.find(c => c.id === invoiceFields.customer_id);
        
        const rawInvoices = JSON.parse(localStorage.getItem('invoisify_invoices') || '[]');
        const source = rawInvoices.find(i => i.id === id);

        const newItems = items.map((item, idx) => ({
          id: item.id || `item-${Date.now()}-${idx}`,
          invoice_id: id,
          ...item
        }));

        const updatedInvoice = {
          ...source,
          invoice_number: invoiceFields.invoice_number,
          customer_id: invoiceFields.customer_id,
          invoice_date: invoiceFields.invoice_date,
          subtotal: invoiceFields.subtotal,
          gst_amount: invoiceFields.gst_amount,
          total_amount: invoiceFields.total_amount,
          paid_amount: invoiceFields.paid_amount,
          status: invoiceFields.status,
          customers: customer,
          invoice_items: newItems
        };

        const updatedRawInvoices = rawInvoices.map(i => i.id === id ? updatedInvoice : i);
        localStorage.setItem('invoisify_invoices', JSON.stringify(updatedRawInvoices));

        // Process for React state
        const profileItem = newItems.find(item => item.program_name === '__profile_metadata__');
        let invoiceProfile = null;
        if (profileItem) {
          try {
            invoiceProfile = JSON.parse(profileItem.description);
          } catch (e) {
            console.error(e);
          }
        }

        const processedInvoice = {
          ...updatedInvoice,
          invoice_profile: invoiceProfile,
          invoice_items: newItems.filter(item => item.program_name !== '__profile_metadata__')
        };

        setInvoices(prev => prev.map(i => i.id === id ? processedInvoice : i));
        showToast('Invoice updated successfully (Trial Mode)', 'success');
        return processedInvoice;
      }
    } catch (err) {
      showToast(err.message || 'Failed to update invoice', 'error');
      throw err;
    }
  };

  const deleteInvoice = async (id) => {
    if (!user) return;
    try {
      if (useSupabase) {
        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      const filtered = invoices.filter(i => i.id !== id);
      if (!useSupabase) {
        const rawInvoices = JSON.parse(localStorage.getItem('invoisify_invoices') || '[]');
        const filteredRaw = rawInvoices.filter(i => i.id !== id);
        localStorage.setItem('invoisify_invoices', JSON.stringify(filteredRaw));
      }
      setInvoices(filtered);
      showToast('Invoice deleted successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete invoice', 'error');
      throw err;
    }
  };

  const duplicateInvoice = async (id) => {
    if (!user) return;
    try {
      const sourceInvoice = invoices.find(i => i.id === id);
      if (!sourceInvoice) throw new Error('Invoice not found');

      // Generate a new temporary serial code sequence
      const matchYear = new Date().getFullYear().toString();
      const userInvsThisYear = invoices.filter(i => i.invoice_number.startsWith(`INV-${matchYear}-`));
      
      let nextNum = 1;
      if (userInvsThisYear.length > 0) {
        const numbers = userInvsThisYear.map(i => {
          const parts = i.invoice_number.split('-');
          return parseInt(parts[2], 10) || 0;
        });
        nextNum = Math.max(...numbers) + 1;
      }
      
      const newInvNumber = `INV-${matchYear}-${nextNum.toString().padStart(5, '0')}`;

      // Set up duplicate fields
      const newInvoiceFields = {
        invoice_number: newInvNumber,
        customer_id: sourceInvoice.customer_id,
        invoice_date: new Date().toISOString().split('T')[0],
        subtotal: sourceInvoice.subtotal,
        gst_amount: sourceInvoice.gst_amount,
        total_amount: sourceInvoice.total_amount,
        paid_amount: 0,
        status: 'pending'
      };

      const items = sourceInvoice.invoice_items.map(item => ({
        program_name: item.program_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst_percentage: item.gst_percentage,
        gst_amount: item.gst_amount,
        total_amount: item.total_amount
      }));

      // Copy the profile metadata item if it exists
      if (sourceInvoice.invoice_profile) {
        items.push({
          program_name: '__profile_metadata__',
          description: JSON.stringify(sourceInvoice.invoice_profile),
          quantity: 1,
          unit_price: 0,
          gst_percentage: 0,
          gst_amount: 0,
          total_amount: 0
        });
      }

      await addInvoice(newInvoiceFields, items);
    } catch (err) {
      showToast(err.message || 'Failed to duplicate invoice', 'error');
    }
  };

  const value = {
    customers,
    invoices,
    settings,
    profiles,
    loadingStates,
    toasts,
    darkMode,
    toggleTheme,
    showToast,
    removeToast,
    confirm,
    alert,
    fetchSettings,
    fetchProfiles,
    updateSettings,
    uploadLogo,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    fetchInvoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    duplicateInvoice,
    addProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
    isTrialMode: !useSupabase
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={!!dialogState}
        title={dialogState?.title || ''}
        message={dialogState?.message || ''}
        type={dialogState?.type || 'info'}
        confirmText={dialogState?.confirmText || 'Confirm'}
        cancelText={dialogState?.cancelText || 'Cancel'}
        isAlert={dialogState?.isAlert || false}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
