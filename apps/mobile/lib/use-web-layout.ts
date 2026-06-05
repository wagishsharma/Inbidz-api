import { Platform, useWindowDimensions } from 'react-native';
import { layout } from '@/constants/theme';

export function useWebLayout() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= layout.webBreakpoint;
  const showAside = isDesktop && width >= layout.webWideBreakpoint;

  const sideNavWidth = layout.webSideNavWidth;
  const asideWidth = showAside ? layout.webAsideWidth : 0;
  const horizontalGutter = isDesktop ? layout.webGutter * 2 : 0;

  const feedColumnWidth = isDesktop
    ? Math.min(
        layout.feedMaxWidth,
        Math.max(320, width - sideNavWidth - asideWidth - horizontalGutter)
      )
    : isWeb && layout.maxWidth
      ? Math.min(width, layout.maxWidth)
      : width;

  return {
    isWeb,
    isDesktop,
    showAside,
    windowWidth: width,
    windowHeight: height,
    feedColumnWidth,
    sideNavWidth,
    asideWidth,
  };
}
