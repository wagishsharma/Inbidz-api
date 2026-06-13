import { createElement, useCallback, useLayoutEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

type Props = {
  uri: string;
  poster?: string;
  width: number;
  height: number;
  active: boolean;
  muted: boolean;
  contain?: boolean;
  audioSyncEpoch?: number;
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
  audioSyncEpoch = 0,
  onNaturalSize,
}: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  const applyAudioState = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
    el.volume = muted ? 0 : 1;
  }, [muted]);

  const tryPlay = useCallback(() => {
    const el = ref.current;
    if (!el || !active) return;
    applyAudioState();
    void el.play().catch(() => {});
  }, [active, applyAudioState]);

  useLayoutEffect(() => {
    applyAudioState();
  }, [applyAudioState, audioSyncEpoch]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (active) {
      tryPlay();
      return;
    }

    el.pause();
  }, [active, uri, tryPlay]);

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        applyAudioState();
        if (active) tryPlay();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [active, applyAudioState, tryPlay]);

  useLayoutEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        applyAudioState();
        if (active) tryPlay();
      }
    });
    return () => sub.remove();
  }, [active, applyAudioState, tryPlay]);

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
