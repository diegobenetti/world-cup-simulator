'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '../lib/LanguageContext';

export function DonationToast() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'done' | 'canceled' | null>(null);
  const [visible, setVisible] = useState(false);

  const dismiss = () => {
    setVisible(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('donation');
    window.history.replaceState(null, '', url.toString());
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const donation = params.get('donation');
    if (donation === 'done' || donation === 'canceled') {
      setStatus(donation);
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 6000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || !status) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`relative w-full max-w-md mx-4 bg-gray-900 shadow-xl rounded-xl px-8 py-8 border text-white text-center ${
          status === 'done' ? 'border-green-600' : 'border-gray-700'
        }`}
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-300 text-lg leading-none"
        >
          ✕
        </button>
        <p className="text-base font-semibold mb-2">
          {status === 'done' ? t.donationDoneTitle : t.donationCanceledTitle}
        </p>
        <p className="text-sm text-gray-400">
          {status === 'done' ? t.donationDoneMessage : t.donationCanceledMessage}
        </p>
      </div>
    </div>
  );
}
