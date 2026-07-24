import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import DocumentUpload from './DocumentUpload';
import {
  CheckCircle2, AlertCircle, Shield, Globe, Landmark,
  ArrowRight, Check, X, Building2, UserCircle2, ChevronRight,
  Loader2, Camera, MapPin, FileText, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface AccountTiersProps {
  onBack: () => void;
  onUpdate: (newLevel: number) => void;
}

interface Tier {
  id: number;
  name: string;
  friendlyName: string;
  requirements: string[];
  features: string[];
  limits: string;
  color: string;
  status: 'locked' | 'current' | 'completed' | 'available';
}

interface UploadedDocument {
  file: File;
  previewUrl: string;
  type: string;
}

export default function AccountTiers({ onBack, onUpdate }: AccountTiersProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [showUpgradeFlow, setShowUpgradeFlow] = useState(false);
  const [upgradingTo, setUpgradingTo] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPersonalInfoForm, setShowPersonalInfoForm] = useState(false);
  const [personalInfoSaved, setPersonalInfoSaved] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showBvnForm, setShowBvnForm] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [kycTierRequested, setKycTierRequested] = useState<number | null>(null);
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    address: '',
    city: '',
  });

  useEffect(() => {
    const fetchCloudData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Try profile table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        const data = profile || session.user.user_metadata;
        setCurrentLevel(data.kyc_level || 0);
        setKycStatus(data.kyc_status || 'none');
        setKycTierRequested(data.kyc_tier_requested || null);
        
        // Check if we have personal details from profile
        const hasProfileData = profile?.first_name && profile?.last_name;
        
        setPersonalInfo({
          firstName: profile?.first_name || data.firstName || '',
          lastName: profile?.last_name || data.lastName || '',
          dateOfBirth: profile?.date_of_birth || data.dateOfBirth || '',
          address: profile?.address || data.address || '',
          city: profile?.city || data.city || '',
        });

        // Mark as saved if we have personal details from signup
        if (hasProfileData || (data.firstName && data.lastName)) {
          setPersonalInfoSaved(true);
        }
      }
    };
    fetchCloudData();
  }, []);

  const tiers: Tier[] = [
    {
      id: 0,
      name: 'Tier 0',
      friendlyName: 'Border Guest',
      requirements: ['Phone number', 'Email verification'],
      features: ['View exchange rates', 'Wallet preview (read-only)', 'Receive funds (locked)'],
      limits: 'No withdrawals or transfers',
      color: 'bg-gray-100 text-gray-700',
      status: currentLevel === 0 ? 'current' : 'completed',
    },
    {
      id: 1,
      name: 'Tier 1',
      friendlyName: 'Border Basic',
      requirements: ['Full name', 'Date of birth', 'BVN or National ID'],
      features: ['Naira wallet', 'Local transfers', 'Bill payments', 'QR payments', 'Virtual POS'],
      limits: '₦50,000 - ₦100,000 Daily',
      color: 'bg-blue-100 text-blue-700',
      status: currentLevel === 1 ? 'current' : currentLevel > 1 ? 'completed' : 'available',
    },
    {
      id: 2,
      name: 'Tier 2',
      friendlyName: 'Border Plus',
      requirements: ['Government-issued ID', 'Selfie / Liveness check', 'Basic address'],
      features: ['Multi-currency wallets', 'FX conversion', 'International P2P', 'Virtual USD cards', 'SecurePay'],
      limits: '₦1,000,000 Daily',
      color: 'bg-purple-100 text-purple-700',
      status: currentLevel === 2 ? 'current' : currentLevel > 2 ? 'completed' : currentLevel === 1 ? 'available' : 'locked',
    },
    {
      id: 3,
      name: 'Tier 3',
      friendlyName: 'Border Pro',
      requirements: ['Proof of address', 'Business details (if applicable)', 'KYB for companies'],
      features: ['Higher FX limits', 'Stablecoin settlement', 'International bank payouts', 'API Access', 'Bulk transfers'],
      limits: 'Custom Limits',
      color: 'bg-orange-100 text-orange-700',
      status: currentLevel === 3 ? 'current' : currentLevel > 3 ? 'completed' : currentLevel === 2 ? 'available' : 'locked',
    },
    {
      id: 4,
      name: 'Tier 4',
      friendlyName: 'Border Business',
      requirements: ['Full KYB', 'Compliance review', 'Contract agreement'],
      features: ['Custom pricing', 'Dedicated settlement rails', 'White-label POS', 'SLA support'],
      limits: 'Unlimited',
      color: 'bg-red-100 text-red-700',
      status: currentLevel === 4 ? 'current' : currentLevel < 4 && currentLevel >= 3 ? 'available' : 'locked',
    },
  ];

  const handleStartUpgrade = async (tierId: number) => {
    setUpgradingTo(tierId);
    
    // Fetch latest data from cloud before showing flow
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      const data = profile || session.user.user_metadata;
      setPersonalInfo({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        dateOfBirth: data.dateOfBirth || '',
        address: data.address || '',
        city: data.city || '',
      });
    }
    
    setShowUpgradeFlow(true);
  };

  const handleSavePersonalInfo = async () => {
    // Validate personal info
    if (!personalInfo.firstName || !personalInfo.lastName) {
      toast.error('Please enter your first and last name');
      return;
    }
    
    if (!personalInfo.dateOfBirth) {
      toast.error('Please enter your date of birth');
      return;
    }
    
    if (!personalInfo.city) {
      toast.error('Please enter your city');
      return;
    }
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      // 1. Update Profiles table (Cloud)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          dateOfBirth: personalInfo.dateOfBirth,
          address: personalInfo.address,
          city: personalInfo.city,
          name: `${personalInfo.firstName} ${personalInfo.lastName}`
        })
        .eq('id', session.user.id);

      if (profileError) {
      }

      // 2. Update Auth Metadata (Cloud)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          dateOfBirth: personalInfo.dateOfBirth,
          address: personalInfo.address,
          city: personalInfo.city,
          name: `${personalInfo.firstName} ${personalInfo.lastName}`
        }
      });

      if (authError) throw authError;
      
      setPersonalInfoSaved(true);
      toast.success('Personal information saved to cloud!');
      setShowPersonalInfoForm(false);
    } catch (err) {
      toast.error('An error occurred while saving. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [bvnInput, setBvnInput] = useState('');
  const [bvnLoading, setBvnLoading] = useState(false);

  const handleCompleteUpgrade = async () => {
    if (upgradingTo === 1) {
      setShowBvnForm(true);
      return;
    }
    setShowDocumentUpload(true);
  };

  const handleSubmitBvn = async () => {
    if (!bvnInput || bvnInput.length !== 11) {
      toast.error('Enter a valid 11-digit BVN'); return;
    }
    setBvnLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      await supabase.from('profiles')
        .update({ bvn: bvnInput, kyc_level: 1 })
        .eq('id', session.user.id);
      await supabase.from('kyc_verifications').upsert({
        user_id: session.user.id, tier: 1, status: 'approved',
        documents: [], submitted_at: new Date().toISOString(), reviewed_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setCurrentLevel(1);
      setShowBvnForm(false);
      setUpgradingTo(null);
      setBvnInput('');
      toast.success('Border Basic unlocked!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save BVN');
    } finally {
      setBvnLoading(false);
    }
  };

  const getDocumentRequirements = (tier: number) => {
    switch (tier) {
      case 1:
        return [
          { type: 'id_front', label: 'National ID / BVN Card (Front)', description: 'Clear photo of your ID or BVN slip' },
          { type: 'id_back', label: 'National ID (Back)', description: 'Back of your ID card (if applicable)' }
        ];
      case 2:
        return [
          { type: 'government_id', label: 'Government ID', description: 'Passport, Driver\'s License, or National ID' },
          { type: 'selfie', label: 'Selfie / Liveness Photo', description: 'Clear selfie showing your face' },
          { type: 'address_proof', label: 'Proof of Address', description: 'Utility bill or bank statement (last 3 months)' }
        ];
      case 3:
      case 4:
        return [
          { type: 'business_registration', label: 'Business Registration', description: 'CAC certificate or business documents' },
          { type: 'address_proof', label: 'Proof of Address', description: 'Recent utility bill or lease agreement' },
          { type: 'tax_id', label: 'Tax ID / TIN', description: 'Tax identification document' }
        ];
      default:
        return [];
    }
  };

  const handleDocumentUpload = (type: string, file: File, previewUrl: string) => {
    setUploadedDocuments(prev => {
      const filtered = prev.filter(doc => doc.type !== type);
      return [...filtered, { file, previewUrl, type }];
    });
  };

  const handleSubmitDocuments = async () => {
    if (!upgradingTo) return;
    
    const requirements = getDocumentRequirements(upgradingTo);
    const uploadedTypes = uploadedDocuments.map(doc => doc.type);
    const missingDocs = requirements.filter(req => !uploadedTypes.includes(req.type));
    
    if (missingDocs.length > 0) {
      toast.error(`Please upload: ${missingDocs[0].label}`);
      return;
    }

    setUploadingDocs(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const userId = session.user.id;
      const timestamp = Date.now();

      // Upload documents to Supabase Storage
      const uploadPromises = uploadedDocuments.map(async (doc) => {
        const fileExt = doc.file.name.split('.').pop() || 'jpg';
        const fileName = `${userId}/${upgradingTo}/${doc.type}_${timestamp}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('kyc-documents')
          .upload(fileName, doc.file, {
            cacheControl: '3600',
            upsert: false,
            contentType: doc.file.type || 'image/jpeg'
          });

        if (error) {
          if (error.message?.toLowerCase().includes('bucket not found')) {
            throw new Error("KYC Storage bucket 'kyc-documents' not found. Please contact support.");
          }
          throw error;
        }
        return { type: doc.type, path: data.path };
      });

      const uploadedPaths = await Promise.all(uploadPromises);

      // Create KYC verification request in database
      const { error: insertError } = await supabase
        .from('kyc_verifications')
        .insert({
          user_id: userId,
          tier: upgradingTo,
          status: 'pending',
          documents: uploadedPaths,
          submitted_at: new Date().toISOString(),
          personal_info: personalInfo
        });

      if (insertError) {
        // Continue anyway - documents are uploaded
      }

      // Update user metadata to pending
      await supabase.auth.updateUser({
        data: {
          kyc_status: 'pending',
          kyc_tier_requested: upgradingTo
        }
      });

      // Also update profiles table
      await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'pending',
          kyc_tier_requested: upgradingTo
        })
        .eq('id', userId);

      toast.success('Documents uploaded successfully!');
      toast.info('Your verification is under review. We\'ll notify you within 24-48 hours.', {
        duration: 6000
      });

      setShowDocumentUpload(false);
      setShowUpgradeFlow(false);
      setUploadedDocuments([]);
      setUpgradingTo(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload documents');
    } finally {
      setUploadingDocs(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Account Tiers</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Progress Card */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <CardContent className="pt-6 relative z-10">
            <p className="text-blue-100 text-sm mb-1">Your Current Level</p>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold">{tiers[currentLevel].friendlyName}</h2>
                <p className="text-blue-100 text-xs">Level {currentLevel} of 4</p>
              </div>
              <Badge className="bg-white/20 text-white border-0 py-1 px-3">
                {currentLevel === 4 ? 'Max Tier' : 'Active'}
              </Badge>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(currentLevel / 4) * 100}%` }}
                className="h-full bg-white"
              />
            </div>
            <p className="text-xs text-blue-100">
              {currentLevel < 4 
                ? `Upgrade to ${tiers[currentLevel + 1].friendlyName} to unlock more features`
                : 'You have reached the maximum business tier.'}
            </p>
          </CardContent>
        </Card>

        {/* Tiers List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 px-1">Available Levels</h3>
          {tiers.map((tier) => (
            <Card 
              key={tier.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                tier.id === currentLevel ? 'ring-2 ring-blue-500 shadow-md' : ''
              } ${tier.status === 'locked' ? 'opacity-70' : ''}`}
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tier.color}`}>
                      {tier.id <= currentLevel ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{tier.id}</span>}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{tier.friendlyName}</h4>
                      <p className="text-xs text-gray-500">{tier.name}</p>
                    </div>
                  </div>
                  {tier.id === currentLevel && (
                    <Badge className="bg-blue-100 text-blue-700 border-0">Current</Badge>
                  )}
                  {tier.status === 'locked' && (
                    <Shield className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Requirements</p>
                    <ul className="space-y-1">
                      {tier.requirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <div className={`w-1 h-1 rounded-full ${tier.id <= currentLevel ? 'bg-green-500' : 'bg-gray-300'}`} />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Daily Limit</p>
                    <p className="text-xs font-semibold text-gray-900">{tier.limits}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Unlocked Features</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tier.features.map((feat, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full border border-gray-200">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {tier.status === 'available' && (
                  <Button 
                    onClick={() => handleStartUpgrade(tier.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                  >
                    Upgrade Tier <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
                
                {tier.status === 'locked' && (
                  <Button variant="ghost" disabled className="w-full text-gray-400 cursor-not-allowed">
                    Complete previous tier first
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Upgrade Flow Modal */}
      <AnimatePresence>
        {showUpgradeFlow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Upgrade to {tiers[upgradingTo || 0].friendlyName}</h2>
                  <p className="text-gray-500 text-sm">Follow the steps below to verify your account</p>
                </div>
                <button 
                  onClick={() => setShowUpgradeFlow(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6 mb-8">
                {upgradingTo === 1 && (
                  <>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Personal Details Complete</p>
                          <p className="text-xs text-gray-500">Collected during account signup</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm font-bold text-blue-800 mb-1">BVN Required</p>
                      <p className="text-xs text-blue-600">Enter your 11-digit Bank Verification Number. No document upload needed for Border Basic.</p>
                    </div>
                  </>
                )}
                {upgradingTo === 2 && (
                  <>
                    <button 
                      onClick={handleCompleteUpgrade}
                      disabled={loading}
                      className="w-full flex gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Camera className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">Liveness Check</p>
                        <p className="text-xs text-gray-500">Take a quick selfie to verify it's you</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                    <button 
                      onClick={handleCompleteUpgrade}
                      disabled={loading}
                      className="w-full flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">Address Proof</p>
                        <p className="text-xs text-gray-500">Utility bill or Bank statement</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </>
                )}
                {upgradingTo && upgradingTo >= 3 && (
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-center">
                    <Building2 className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                    <p className="font-semibold text-gray-900">Business Verification</p>
                    <p className="text-sm text-gray-600 mt-1">Our compliance team will review your business documents within 24-48 hours.</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleCompleteUpgrade}
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Verifying details...
                    </>
                  ) : (
                    'Start Verification'
                  )}
                </Button>
                <button 
                  onClick={() => setShowUpgradeFlow(false)}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors py-2"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personal Info Form */}
      <AnimatePresence>
        {showPersonalInfoForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Enter Personal Details</h2>
                  <p className="text-gray-500 text-sm">Provide your personal information to proceed</p>
                </div>
                <button 
                  onClick={() => setShowPersonalInfoForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    type="text" 
                    value={personalInfo.firstName} 
                    onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    type="text" 
                    value={personalInfo.lastName} 
                    onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input 
                    id="dateOfBirth" 
                    type="date" 
                    value={personalInfo.dateOfBirth} 
                    onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address" 
                    type="text" 
                    value={personalInfo.address} 
                    onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    type="text" 
                    value={personalInfo.city} 
                    onChange={(e) => setPersonalInfo({ ...personalInfo, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-6">
                <Button 
                  onClick={handleSavePersonalInfo}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg"
                >
                  Save and Continue
                </Button>
                <button 
                  onClick={() => setShowPersonalInfoForm(false)}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors py-2"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BVN Form Modal — Border Basic only */}
      <AnimatePresence>
        {showBvnForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Enter Your BVN</h3>
                <button onClick={() => setShowBvnForm(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Your BVN is required to unlock Border Basic. Dial <strong>*565*0#</strong> to retrieve it.</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bvnInput">Bank Verification Number (BVN)</Label>
                  <Input
                    id="bvnInput"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="Enter 11-digit BVN"
                    value={bvnInput}
                    onChange={e => setBvnInput(e.target.value.replace(/\D/g, ''))}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleSubmitBvn}
                  disabled={bvnLoading || bvnInput.length !== 11}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {bvnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit BVN & Unlock'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Upload Modal */}
      <AnimatePresence>
        {showDocumentUpload && upgradingTo !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-3 sm:hidden" />
              
              <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
                  <p className="text-gray-500 text-sm">Upload the required documents to proceed</p>
                </div>
                <button 
                  onClick={() => setShowDocumentUpload(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {getDocumentRequirements(upgradingTo).map(req => (
                  <DocumentUpload
                    key={req.type}
                    documentType={req.type}
                    label={req.label}
                    description={req.description}
                    onUploadComplete={(file, previewUrl) => handleDocumentUpload(req.type, file, previewUrl)}
                    existingPreview={uploadedDocuments.find(doc => doc.type === req.type)?.previewUrl}
                    isUploading={uploadingDocs}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 px-6 py-4 border-t border-gray-200">
                <Button 
                  onClick={handleSubmitDocuments}
                  disabled={uploadingDocs || uploadedDocuments.length === 0}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg"
                >
                  {uploadingDocs ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Submit Documents ({uploadedDocuments.length}/{getDocumentRequirements(upgradingTo).length})
                    </>
                  )}
                </Button>
                <button 
                  onClick={() => setShowDocumentUpload(false)}
                  disabled={uploadingDocs}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors py-2"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}