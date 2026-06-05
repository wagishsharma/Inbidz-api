import { createElement, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

type Props = {
  uri: string;
  poster?: string;
  width: number;
  height: number;
  active: boolean;
  muted: boolean;
  onNaturalSize?: (width: number, height: number) => void;
};

/** HTML5 video for web immersive — expo-av often clips instead of scaling like native. */
export function ImmersiveWebVideo({
  uri,
  poster,
  width,
  height,
  active,
  muted,
  onNaturalSize,
}: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [active]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    return () => {
      ref.current?.pause();
    };
  }, []);

  if (Platform.OS !== 'web') {
    return null;
  }

  return createElement('video', {
    ref,
    src: uri,
    poster,
    loop: true,
    playsInline: true,
    muted,
    preload: 'metadata',
    onLoadedMetadata: () => {
      const el = ref.current;
      if (el?.videoWidth && el?.videoHeight) {
        onNaturalSize?.(el.videoWidth, el.videoHeight);
      }
    },
    style: {
      width,
      height,
      objectFit: 'cover',
      objectPosition: 'center',
      display: 'block',
      backgroundColor: '#000',
    },
  });
}
