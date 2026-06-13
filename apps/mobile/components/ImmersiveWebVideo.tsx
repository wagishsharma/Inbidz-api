import { createElement, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

type Props = {
  uri: string;
  poster?: string;
  width: number;
  height: number;
  active: boolean;
  muted: boolean;
  contain?: boolean;
  onNaturalSize?: (width: number, height: number) => void;
};

/** HTML5 video for web immersive — preserve source aspect ratio (letterbox). */
export function ImmersiveWebVideo({
  uri,
  poster,
  width,
  height,
  active,
  muted,
  contain = true,
  onNaturalSize,
}: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  const tryPlay = () => {
    const el = ref.current;
    if (!el || !active) return;
    void el.play().catch(() => {});
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (active) {
      tryPlay();
      return;
    }

    el.pause();
  }, [active, uri]);

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
    poster: active ? undefined : poster,
    loop: true,
    playsInline: true,
    autoPlay: active,
    muted,
    preload: active ? 'auto' : 'metadata',
    onLoadedData: tryPlay,
    onCanPlay: tryPlay,
    onLoadedMetadata: () => {
      const el = ref.current;
      if (el?.videoWidth && el?.videoHeight) {
        onNaturalSize?.(el.videoWidth, el.videoHeight);
      }
      tryPlay();
    },
    style: {
      width,
      height,
      objectFit: contain ? 'contain' : 'cover',
      objectPosition: 'center',
      display: 'block',
      backgroundColor: '#000',
    },
  });
}
