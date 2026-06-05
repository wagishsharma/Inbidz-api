import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, sp } from '@/constants/theme';

/** Icon + label row in mobile web tab bar (safe area is separate below). */
export const MOBILE_WEB_TAB_CONTENT_HEIGHT = 60;

export function mobileWebTabBarHeight(bottomInset: number): number {
  return MOBILE_WEB_TAB_CONTENT_HEIGHT + bottomInset;
}

/** Read env(safe-area-inset-bottom) in the browser (0 when unsupported). */
function readSafeAreaBottomPx(): number {
  if (typeof document === 'undefined') return 0;
  const probe = document.getElementById('inbidz-safe-area-probe');
  if (!probe) return 0;
  const px = parseFloat(getComputedStyle(probe).paddingBottom);
  return Number.isNaN(px) ? 0 : px;
}

/**
 * Padding below tab icons/labels inside the tab bar shell (not a gap below the bar).
 */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobileWeb = Platform.OS === 'web' && width < layout.webBreakpoint;
  const [envBottom, setEnvBottom] = useState(0);

  useEffect(() => {
    if (!isMobileWeb) return;

    const update = () => setEnvBottom(readSafeAreaBottomPx());

    update();
    window.visualViewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, [isMobileWeb]);

  if (!isMobileWeb) {
    return Math.max(insets.bottom, sp(8));
  }

  const isIOS =
    typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return Math.max(insets.bottom, envBottom, isIOS ? sp(14) : sp(10));
}

/** Scroll content padding so the last row clears the tab bar (mobile web only). */
export function useScrollBottomPadding(defaultPad = 24): number {
  const bottomInset = useTabBarBottomInset();
  const { width } = useWindowDimensions();
  const isMobileWeb = Platform.OS === 'web' && width < layout.webBreakpoint;

  if (!isMobileWeb) {
    return sp(defaultPad);
  }

  return mobileWebTabBarHeight(bottomInset) + sp(8);
}
