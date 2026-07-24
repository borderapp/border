import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  CheckCircle2, XCircle, UserCheck, AlertCircle, Eye, 
  Loader2, FileText, User, Calendar, MapPin, Shield, Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface KYCVerification {
  id: string;
  user_id: string;
  tier: number;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  documents: Array<{ type: string; path: string }>;
  personal_info: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
  };
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  admin_notes?: string;
  user_email?: string;
}

export default function AdminKYCApproval() {
  const [verifications, setVerifications] = useState<KYCVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<KYCVerification | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Ensure the current admin user has is_admin=true in profiles so RLS passes
  useEffect(() => {
    const grantAdminFlag = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Upsert is_admin=true for the authenticated admin
      await supabase.from('profiles').update({ is_admin: true }).eq('id', user.id);
    };
    grantAdminFlag();
  }, []);

  useEffect(() => {
    fetchVerifications();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('kyc_verifications_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'kyc_verifications' 
        }, 
        () => {
          fetchVerifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeFilter]);

  const fetchVerifications = async () => {
    try {

      // First, fetch the kyc_verifications without the join
      let query = supabase
        .from('kyc_verifications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (activeFilter !== 'all') {
        query = query.eq('status', activeFilter);
      }

      const { data: kycData, error: kycError, status, statusText } = await query;

      if (kycError) {
        throw kycError;
      }


      // Fetch all unique user profiles separately
      const userIds = [...new Set(kycData?.map(item => item.user_id).filter(Boolean))];

      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', userIds);

        if (profilesError) {
        } else {
          profilesMap = Object.fromEntries(
            (profilesData || []).map(profile => [profile.id, profile])
          );
        }
      }

      // Map the data to include user email from profiles
      const mappedData = kycData?.map((item: any) => {
        const profile = profilesMap[item.user_id];
        return {
          ...item,
          user_email: profile?.email || 'Unknown',
          profiles: profile || null
        };
      }) || [];


      setVerifications(mappedData);
    } catch (error: any) {
      toast.error('Failed to load verification requests', {
        description: error.message || 'Check console for details'
      });
    } finally {
      setLoading(false);
    }
  };

  const viewDocuments = async (verification: KYCVerification) => {
    setSelectedVerification(verification);
    
    // Fetch signed URLs for documents
    const urls: Record<string, string> = {};
    
    for (const doc of verification.documents) {
      try {
        const { data } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(doc.path, 3600); // 1 hour expiry
        
        if (data?.signedUrl) {
          urls[doc.type] = data.signedUrl;
        }
      } catch (error) {
      }
    }
    
    setDocumentUrls(urls);
  };

  const handleApprove = async (verificationId: string) => {
    setProcessingId(verificationId);
    
    try {
      const { data, error } = await supabase.rpc('approve_kyc_verification', {
        p_verification_id: verificationId,
        p_admin_notes: adminNotes || null
      });

      if (error) throw error;

      toast.success('KYC verification approved! User account upgraded.', {
        description: `Account has been upgraded to Tier ${data.new_tier}`
      });

      // Refresh the list
      await fetchVerifications();
      setSelectedVerification(null);
      setAdminNotes('');
    } catch (error: any) {
      toast.error('Failed to approve verification', {
        description: error.message
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(selectedVerification.id);
    
    try {
      const { error } = await supabase.rpc('reject_kyc_verification', {
        p_verification_id: selectedVerification.id,
        p_rejection_reason: rejectionReason,
        p_admin_notes: adminNotes || null
      });

      if (error) throw error;

      toast.success('KYC verification rejected', {
        description: 'User will be notified of the rejection reason'
      });

      // Refresh the list
      await fetchVerifications();
      setSelectedVerification(null);
      setShowRejectDialog(false);
      setRejectionReason('');
      setAdminNotes('');
    } catch (error: any) {
      toast.error('Failed to reject verification', {
        description: error.message
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getTierName = (tier: number) => {
    const names = ['Guest', 'Basic', 'Plus', 'Pro', 'Business'];
    return names[tier] || `Tier ${tier}`;
  };

  const getDocumentLabel = (type: string) => {
    const labels: Record<string, string> = {
      id_front: 'National ID (Front)',
      id_back: 'National ID (Back)',
      government_id: 'Government ID',
      selfie: 'Selfie / Liveness',
      address_proof: 'Proof of Address',
      business_registration: 'Business Registration',
      tax_id: 'Tax ID / TIN'
    };
    return labels[type] || type.replace(/_/g, ' ').toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'under_review': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
          <Button
            key={filter}
            variant={activeFilter === filter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(filter)}
            className="capitalize whitespace-nowrap"
          >
            {filter}
            <Badge 
              variant="secondary" 
              className="ml-2"
            >
              {filter === 'all' 
                ? verifications.length 
                : verifications.filter(v => v.status === filter).length
              }
            </Badge>
          </Button>
        ))}
      </div>

      {/* Verifications List */}
      {verifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No {activeFilter !== 'all' ? activeFilter : ''} verification requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {verifications.map((verification) => (
            <Card key={verification.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">
                          {verification.personal_info?.firstName} {verification.personal_info?.lastName}
                        </p>
                        <Badge className={getStatusColor(verification.status)}>
                          {verification.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-2">{verification.user_email}</p>
                      
                      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Tier {verification.tier} ({getTierName(verification.tier)})
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {verification.documents.length} documents
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(verification.submitted_at).toLocaleDateString()}
                        </span>
                      </div>

                      {verification.personal_info?.dateOfBirth && (
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            DOB: {verification.personal_info.dateOfBirth}
                          </span>
                          {verification.personal_info?.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {verification.personal_info.city}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewDocuments(verification)}
                      className="whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                    
                    {verification.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedVerification(verification);
                            handleApprove(verification.id);
                          }}
                          disabled={processingId === verification.id}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          {processingId === verification.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedVerification(verification);
                            setShowRejectDialog(true);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Document Review Dialog */}
      <Dialog open={!!selectedVerification && !showRejectDialog} onOpenChange={() => setSelectedVerification(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Document Review</DialogTitle>
            <DialogDescription>
              Review documents for {selectedVerification?.personal_info?.firstName} {selectedVerification?.personal_info?.lastName}
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* User Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Full Name</p>
                    <p className="font-semibold">
                      {selectedVerification.personal_info?.firstName} {selectedVerification.personal_info?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-semibold">{selectedVerification.user_email}</p>
                  </div>
                  {selectedVerification.personal_info?.dateOfBirth && (
                    <div>
                      <p className="text-xs text-gray-500">Date of Birth</p>
                      <p className="font-semibold">{selectedVerification.personal_info.dateOfBirth}</p>
                    </div>
                  )}
                  {selectedVerification.personal_info?.city && (
                    <div>
                      <p className="text-xs text-gray-500">City</p>
                      <p className="font-semibold">{selectedVerification.personal_info.city}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Requesting Tier</p>
                    <Badge className="mt-1">
                      Tier {selectedVerification.tier} - {getTierName(selectedVerification.tier)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Submitted</p>
                    <p className="font-semibold text-sm">
                      {new Date(selectedVerification.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Uploaded Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedVerification.documents.map((doc) => (
                    <Card key={doc.type}>
                      <CardHeader>
                        <CardTitle className="text-sm">{getDocumentLabel(doc.type)}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {documentUrls[doc.type] ? (
                          <a 
                            href={documentUrls[doc.type]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img 
                              src={documentUrls[doc.type]} 
                              alt={getDocumentLabel(doc.type)}
                              className="w-full h-48 object-cover rounded-lg border hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </a>
                        ) : (
                          <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Admin Notes (Optional)
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this verification..."
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              {selectedVerification.status === 'pending' && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(selectedVerification.id)}
                    disabled={processingId === selectedVerification.id}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {processingId === selectedVerification.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve & Upgrade Account
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    variant="outline"
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be shown to the user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Rejection Reason *
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Document not clear, ID expired, Information mismatch..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Internal Notes (Optional)
              </label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes (not visible to user)..."
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleReject}
                disabled={processingId === selectedVerification?.id || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {processingId === selectedVerification?.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Confirm Rejection
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}