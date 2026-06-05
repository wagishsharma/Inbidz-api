import { Platform, useWindowDimensions } from 'react-native';
import { layout } from '@/constants/theme';

/** Fit media inside a box without cropping (letterbox if needed). */
export function fitMediaInFrame(
  frameW: number,
  frameH: number,
  mediaW: number,
  mediaH: number
): { width: number; height: number } {
  if (!mediaW || !mediaH) {
    return { width: frameW, height: frameH };
  }
  const mediaAspect = mediaW / mediaH;
  const frameAspect = frameW / frameH;
  if (mediaAspect >= frameAspect) {
    const width = frameW;
    return { width, height: width / mediaAspect };
  }
  const height = frameH;
  return { width: height * mediaAspect, height };
}

/** Max stage box on web; actual size follows active media aspect ratio. */
export function getWebStageMaxBox(winH: number) {
  const metaReserve = 200;
  return {
    maxWidth: layout.immersiveStageMaxWidth,
    maxHeight: Math.min(
      layout.immersiveStageMaxHeight,
      winH - metaReserve,
      Math.floor(winH * 0.82)
    ),
  };
}

export function stageSizeForMedia(
  mediaW: number,
  mediaH: number,
  maxWidth: number,
  maxHeight: number
): { stageWidth: number; stageHeight: number } {
  if (!mediaW || !mediaH) {
    const stageHeight = maxHeight;
    const stageWidth = Math.min(maxWidth, Math.floor(stageHeight * (9 / 16)));
    return { stageWidth, stageHeight };
  }

  const aspect = mediaW / mediaH;
  let stageHeight = maxHeight;
  let stageWidth = stageHeight * aspect;

  if (stageWidth > maxWidth) {
    stageWidth = maxWidth;
    stageHeight = maxWidth / aspect;
  }

  return {
    stageWidth: Math.floor(stageWidth),
    stageHeight: Math.floor(stageHeight),
  };
}

/** Prefer orientation when stored width/height disagree (common with phone video). */
export function normalizeMediaDimensions(
  width?: number,
  height?: number,
  orientation?: 'portrait' | 'landscape' | 'square'
): { width: number; height: number } {
  if (!width || !height) {
    return { width: 9, height: 16 };
  }
  if (orientation === 'portrait' && width > height) {
    return { width: height, height: width };
  }
  if (orientation === 'landscape' && height > width) {
    return { width: height, height: width };
  }
  return { width, height };
}

/** Reels-style stage sizing for web desktop immersive viewer */
export function useImmersiveStageSize(mediaWidth?: number, mediaHeight?: number) {
  const { width: winW, height: winH } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && winW >= layout.webBreakpoint;

  if (!isWebDesktop) {
    return {
      isWebDesktop: false as const,
      stageWidth: winW,
      stageHeight: winH,
      slideHeight: winH,
    };
  }

  const { maxWidth, maxHeight } = getWebStageMaxBox(winH);
  const { stageWidth, stageHeight } = stageSizeForMedia(
    mediaWidth ?? 0,
    mediaHeight ?? 0,
    maxWidth,
    maxHeight
  );

  return {
    isWebDesktop: true as const,
    stageWidth,
    stageHeight,
    slideHeight: winH,
  };
}
