import { useState, useEffect } from "react";
import { X, Smartphone, Star, Download } from "lucide-react";
import { SiAppstore } from "react-icons/si";

const IOS_APP_URL = "https://apps.apple.com/gb/app/sabisend/id6763401572";
const STORAGE_KEY = "sabisend_app_banner";
const DISMISS_DAYS = 14;

type BannerState = {
  downloaded?: boolean;
  dismissedAt?: number;
};

function getStoredState(): BannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredState(state: BannerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function detectDevice(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function shouldShowBanner(): boolean {
  const state = getStoredState();
  if (state.downloaded) return false;
  if (state.dismissedAt) {
    const daysSince = (Date.now() - state.dismissedAt) / (1000 * 60 * 60 * 24);
    if (daysSince < DISMISS_DAYS) return false;
  }
  return true;
}

export function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);
  const [device, setDevice] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const d = detectDevice();
    setDevice(d);

    // Don't show if user has already dismissed recently or downloaded
    if (!shouldShowBanner()) return;

    // Don't show on admin pages
    if (window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/blog-admin")) return;

    // Show after 5s on mobile, 20s on desktop
    const delay = d === "desktop" ? 20000 : 5000;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setStoredState({ ...getStoredState(), dismissedAt: Date.now() });
  };

  const handleDownloaded = () => {
    setVisible(false);
    setStoredState({ downloaded: true });
  };

  const handleDownload = () => {
    setStoredState({ downloaded: true });
    window.open(IOS_APP_URL, "_blank");
    setVisible(false);
  };

  if (!visible) return null;

  // Android: show a subtle "coming soon" variant
  if (device === "android") {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3">
          <div className="bg-blue-600 rounded-xl p-2 shrink-0">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Android app coming soon!</p>
            <p className="text-xs text-gray-400 mt-0.5">We'll notify you when it's ready.</p>
          </div>
          <button onClick={handleDismiss} className="text-gray-500 hover:text-white shrink-0 -mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS mobile: bottom sheet style
  if (device === "ios") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 duration-300 safe-area-bottom">
        <div className="bg-gray-900 text-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-xl p-2.5">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-base">SabiSend on iPhone</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">App Store</span>
                </div>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-gray-500 hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-gray-300 mb-5">
            Compare live rates, set alerts and find the best time to send — all in your pocket.
          </p>

          <button
            onClick={handleDownload}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors"
          >
            <SiAppstore className="h-5 w-5" />
            Download on the App Store
          </button>

          <button
            onClick={handleDownloaded}
            className="w-full text-gray-500 text-sm mt-3 py-1 hover:text-gray-300 transition-colors"
          >
            I already have it
          </button>
        </div>
      </div>
    );
  }

  // Desktop: compact side card
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-white" />
            <span className="font-bold text-sm">SabiSend Mobile</span>
          </div>
          <button onClick={handleDismiss} className="text-blue-200 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-300 mb-1">
            Compare rates & set alerts on the go.
          </p>
          <div className="flex items-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-xs text-gray-400 ml-1">Available on iOS</span>
          </div>

          <a
            href={IOS_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleDownloaded}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
          >
            <SiAppstore className="h-4 w-4" />
            Get on App Store
          </a>

          <button
            onClick={handleDownloaded}
            className="w-full text-gray-600 text-xs mt-2.5 py-1 hover:text-gray-400 transition-colors"
          >
            Already downloaded
          </button>
        </div>
      </div>
    </div>
  );
}

export function useAppBannerDismissed() {
  const state = getStoredState();
  return state.downloaded === true;
}
