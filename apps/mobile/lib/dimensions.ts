import { Dimensions, Platform } from 'react-native';
import { layout } from '@/constants/theme';

export function getContentWidth(): number {
  const { width } = Dimensions.get('window');
  if (Platform.OS === 'web' && layout.maxWidth) {
    return Math.min(width, layout.maxWidth);
  }
  return width;
}

export function getGridItemWidth(columns: number, gap: number, horizontalPadding: number): number {
  const totalWidth = getContentWidth() - horizontalPadding * 2 - gap * (columns - 1);
  return totalWidth / columns;
}
