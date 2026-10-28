import React, { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-4 py-2 text-xs font-semibold hover:bg-[#111111] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        Install Kazumi App
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowIOSGuide(true)}
        className="inline-flex items-center gap-2 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] px-3.5 py-1.5 text-xs font-medium text-[#5F5B55] dark:text-[#A6A198] hover:text-[#1A1918] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Smartphone className="w-3.5 h-3.5" />
        {isIOS ? 'Install on iPhone' : 'Install Web App'}
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-6 shadow-xl">
            <h3 className="text-base font-bold">Install Kazumi Rugs App</h3>
            <p className="mt-2 text-sm text-[#5F5B55] dark:text-[#A6A198] leading-relaxed">
              {isIOS
                ? '1. Tap the Share icon in your Safari toolbar. 2. Scroll down and select "Add to Home Screen" for 1-tap offline-ready browsing.'
                : 'Click the install icon in your browser address bar or menu ("Install Kazumi Rugs") to add the storefront directly to your home screen.'}
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-full bg-[#111111] text-white py-2.5 text-xs font-semibold hover:opacity-90 cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-full bg-[#E9A820] px-4 py-2 text-xs font-semibold text-[#111111] shadow-md">
      <WifiOff className="w-3.5 h-3.5" />
      Offline Mode — Showing cached studio catalog
    </div>
  );
};
