import { Dimensions, Platform } from 'react-native';
import { layout } from '@/constants/theme';

export function getContentWidth(): number {
  const { width } = Dimensions.get('window');
  if (Platform.OS === 'web') {
    if (width >= layout.webBreakpoint) {
      const aside = width >= layout.webWideBreakpoint ? layout.webAsideWidth : 0;
      return Math.min(
        layout.feedMaxWidth,
        Math.max(320, width - layout.webSideNavWidth - aside - layout.webGutter * 2)
      );
    }
    if (layout.maxWidth) {
      return Math.min(width, layout.maxWidth);
    }
  }
  return width;
}

export function getGridItemWidth(columns: number, gap: number, horizontalPadding: number): number {
  const totalWidth = getContentWidth() - horizontalPadding * 2 - gap * (columns - 1);
  return totalWidth / columns;
}
