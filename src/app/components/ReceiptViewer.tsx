import borderLogoText from '@/imports/ChatGPT_Image_Jun_29__2026__06_01_55_PM-removebg-preview.png';
import borderLogoIcon from '@/imports/ChatGPT_Image_Jun_29__2026__06_01_55_PM-removebg-preview.png';
/**
 * ReceiptViewer
 * Opens a full receipt for any transaction — success or failure.
 * Can be driven by a full transaction object or just a transaction ID
 * (it fetches the record from Supabase).
 *
 * Usage:
 *   <ReceiptViewer txId="abc-123" onClose={() => setOpen(false)} />
 *   <ReceiptViewer tx={transactionObject} onClose={() => setOpen(false)} />
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle, XCircle, Share2, Download,
  Loader2, Copy, Check,
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ReceiptViewerProps {
  txId?: string;
  tx?: any;
  /** Pass a notification object directly — used as fallback when no DB record exists */
  notification?: any;
  onClose: () => void;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'C$',
};

function sym(currency: string) { return CURRENCY_SYMBOL[currency] || currency; }

function receiptText(tx: any): string {
  const meta = tx.metadata || {};
  const ok   = tx.status === 'completed';
  const recipientName = meta.recipient_name || tx.recipient_name || meta.account_name || meta.customer_name || '';
  const bankName      = meta.bank_name || meta.bank || tx.recipient_bank_name || '';
  const accountNum    = meta.account_number || tx.recipient_account_number || meta.account || '';
  return [
    `BORDER ${ok ? 'RECEIPT' : 'FAILED TRANSACTION'}`,
    '======================',
    `Status      : ${ok ? 'Completed' : 'Failed'}`,
    tx.failure_reason  ? `Reason      : ${tx.failure_reason}` : '',
    `Description : ${tx.description || tx.narration || ''}`,
    `Amount      : ${sym(tx.currency || 'NGN')}${Number(tx.amount || 0).toLocaleString()}`,
    // Transfer fields
    recipientName      ? `Recipient   : ${recipientName}` : '',
    bankName           ? `Bank        : ${bankName}` : '',
    accountNum         ? `Account No. : ${accountNum}` : '',
    meta.routing_number? `Routing No. : ${meta.routing_number}` : '',
    meta.purpose || tx.narration ? `Purpose     : ${meta.purpose || tx.narration}` : '',
    // Bill fields
    meta.network       ? `Network     : ${meta.network}` : '',
    meta.phone         ? `Phone       : ${meta.phone}` : '',
    meta.token         ? `Token       : ${meta.token}` : '',
    meta.pins          ? `PIN(s)      : ${meta.pins}` : '',
    meta.plan          ? `Plan        : ${meta.plan}` : '',
    `Reference   : ${tx.reference || tx.transaction_reference || ''}`,
    `Date        : ${tx.created_at ? new Date(tx.created_at).toLocaleString('en-NG') : ''}`,
    '======================',
    'Powered by Border',
  ].filter(Boolean).join('\n');
}

/** Build a receipt-like object directly from a notification when no DB record exists */
function notifToReceipt(n: any): any {
  const m = n.metadata || {};
  const isSuccess = !n.title?.includes('❌') && !n.title?.toLowerCase().includes('fail');
  return {
    description:           n.message || n.title || '',
    narration:             n.message || '',
    amount:                m.amount   || 0,
    currency:              m.currency || 'NGN',
    status:                isSuccess ? 'completed' : 'failed',
    failure_reason:        m.failure_reason || '',
    reference:             m.reference || m.transaction_reference || '',
    transaction_reference: m.reference || m.transaction_reference || '',
    created_at:            n.created_at,
    // Top-level fields ReceiptViewer reads directly
    recipient_name:        m.recipient_name || '',
    recipient_bank_name:   m.bank_name || '',
    recipient_account_number: m.account_number || '',
    metadata: {
      // Transfer fields
      recipient_name:   m.recipient_name  || '',
      bank_name:        m.bank_name       || '',
      bank:             m.bank_name       || '',
      account_number:   m.account_number  || '',
      routing_number:   m.routing_number  || '',
      transfer_type:    m.transfer_type   || '',
      purpose:          m.purpose         || '',
      // Bill fields
      customer_name:    m.customer_name   || '',
      account:          m.account         || m.account_number || '',
      phone:            m.phone           || '',
      network:          m.network         || '',
      plan:             m.plan            || '',
      token:            m.token           || '',
      pins:             m.pins            || '',
    },
  };
}

export default function ReceiptViewer({ txId, tx: txProp, notification, onClose }: ReceiptViewerProps) {
  // If we have a direct tx or a notification, use immediately — no async needed
  const initialTx = txProp || (notification ? notifToReceipt(notification) : null);

  const [tx, setTx]           = useState<any>(initialTx);
  // Only show loading spinner when we need a DB fetch AND have no fallback data
  const [loading, setLoading] = useState(!initialTx && !!txId);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    // If we already have data from props/notification, nothing to do
    if (initialTx) return;
    // If no txId to search by, nothing to do
    if (!txId) return;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(txId);

    const doQuery = async () => {
      const orFilter = isUuid
        ? `id.eq.${txId},reference.eq.${txId},transaction_reference.eq.${txId}`
        : `reference.eq.${txId},transaction_reference.eq.${txId}`;

      const { data } = await supabase
        .from('transactions').select('*').or(orFilter).limit(1);

      if (data && data.length > 0) { setTx(data[0]); return; }

      // Fallback: search inside metadata JSON
      const { data: m2 } = await supabase
        .from('transactions').select('*')
        .contains('metadata', { reference: txId }).limit(1);

      if (m2 && m2.length > 0) { setTx(m2[0]); return; }

      const { data: m3 } = await supabase
        .from('transactions').select('*')
        .contains('metadata', { transaction_reference: txId }).limit(1);

      if (m3 && m3.length > 0) setTx(m3[0]);
    };

    doQuery().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId]);

  const handleShare = () => {
    if (!tx) return;
    const text = receiptText(tx);
    if (navigator.share) {
      navigator.share({ title: 'Border Receipt', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Receipt copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!tx) return;
    const text = receiptText(tx);
    const blob = new Blob([text], { type: 'text/plain' });
    const a    = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `Border_Receipt_${tx.reference || tx.id}.txt`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (!tx) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500">Transaction not found</p>
      <Button variant="outline" onClick={onClose}>Go Back</Button>
    </div>
  );

  const isSuccess = tx.status === 'completed';
  const meta      = tx.metadata || {};
  const amount    = Number(tx.amount || 0);
  const currency  = tx.currency || 'NGN';
  const date      = tx.created_at ? new Date(tx.created_at).toLocaleString('en-NG') : '';
  const ref       = tx.reference || tx.transaction_reference || tx.id;

  // Consolidate recipient/bank fields from all possible storage locations
  // (different flows store them under different keys)
  const recipientName =
    meta.recipient_name || tx.recipient_name ||
    meta.account_name   || meta.customer_name || '';
  const bankName =
    meta.bank_name || meta.bank || tx.recipient_bank_name || '';
  const accountNum =
    meta.account_number || tx.recipient_account_number || meta.account || '';
  const routingNum =
    meta.routing_number || '';
  const transferPurpose =
    meta.purpose || tx.narration || '';

  const rows = [
    { label: 'Description',     value: tx.description || tx.narration },
    // Transfer fields
    recipientName              && { label: 'Recipient',      value: recipientName },
    bankName                   && { label: 'Bank',           value: bankName },
    accountNum                 && { label: 'Account No.',    value: accountNum },
    routingNum                 && { label: 'Routing No.',    value: routingNum },
    transferPurpose            && { label: 'Purpose',        value: transferPurpose },
    // Bill payment fields
    meta.network               && { label: 'Network',        value: meta.network },
    meta.customer_name && !recipientName && { label: 'Customer', value: meta.customer_name },
    meta.account && !accountNum  && { label: 'Account',      value: meta.account },
    meta.phone                 && { label: 'Phone',          value: meta.phone },
    meta.plan                  && { label: 'Plan',           value: meta.plan },
    meta.token                 && { label: 'Token',          value: meta.token },
    meta.pins                  && { label: 'PIN(s)',         value: meta.pins },
    // Status
    !isSuccess && tx.failure_reason && { label: 'Reason',   value: tx.failure_reason },
    { label: 'Status',           value: isSuccess ? '✅ Completed' : '❌ Failed' },
    { label: 'Reference',        value: ref },
    { label: 'Date',             value: date },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {isSuccess ? 'Receipt' : 'Failed Transaction'}
        </h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-3 pb-8">
        {/* Border logo on receipt */}
        <div className="text-center py-2">
          <img src={borderLogoText} alt="Border" className="h-8 mx-auto object-contain" />
        </div>

        {/* Amount card */}
        <div className={`rounded-2xl p-6 text-center text-white ${isSuccess ? 'bg-green-600' : 'bg-red-500'}`}>
          {isSuccess
            ? <CheckCircle className="w-14 h-14 mx-auto mb-2 opacity-90" />
            : <XCircle     className="w-14 h-14 mx-auto mb-2 opacity-90" />}
          <p className="text-sm opacity-80 mb-1">
            {isSuccess ? 'Payment Successful' : 'Payment Failed'}
          </p>
          <p className="text-3xl font-bold">
            {sym(currency)}{amount.toLocaleString()}
          </p>
          <p className="text-sm opacity-70 mt-1">{currency}</p>
        </div>

        {/* Receipt rows */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="divide-y divide-gray-100">
            {rows.map(row => (
              <div key={row.label} className="flex justify-between items-start px-5 py-3">
                <span className="text-sm text-gray-400 shrink-0 mr-4">{row.label}</span>
                <span className="text-sm font-medium text-gray-900 text-right break-all">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="gap-2" onClick={handleShare}>
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Share'}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleDownload}>
            <Download className="w-4 h-4" /> Download
          </Button>
        </div>

        <Button className="w-full" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
