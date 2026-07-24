import { ArrowLeft, Smartphone, Zap } from 'lucide-react';

interface VirtualPOSProps {
  onBack: () => void;
}

export default function VirtualPOS({ onBack }: VirtualPOSProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white text-lg font-bold">Virtual POS</h1>
      </div>

      {/* Coming soon content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-20">
        <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mb-8">
          <Smartphone className="w-12 h-12 text-white/60" />
        </div>

        <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 mb-6">
          <Zap className="w-3.5 h-3.5 text-blue-300" />
          <span className="text-blue-300 text-xs font-bold uppercase tracking-widest">Coming Soon</span>
        </div>

        <h2 className="text-white text-3xl font-bold mb-4">Virtual POS</h2>
        <p className="text-gray-400 text-base leading-relaxed max-w-xs">
          Accept tap-to-pay, QR payments, and card transactions directly from your phone.
          This feature is currently being activated for Nigerian merchants.
        </p>

        <div className="mt-10 grid grid-cols-3 gap-4 w-full max-w-xs">
          {[
            { icon: '📲', label: 'NFC Tap-to-Pay' },
            { icon: '📷', label: 'QR Payments' },
            { icon: '💳', label: 'Card Acceptance' },
          ].map(f => (
            <div key={f.label} className="bg-white/5 rounded-2xl p-4 text-center">
              <p className="text-2xl mb-2">{f.icon}</p>
              <p className="text-gray-400 text-[11px] font-medium">{f.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onBack}
          className="mt-10 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-semibold transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
