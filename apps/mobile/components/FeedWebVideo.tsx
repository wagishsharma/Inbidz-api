import { createElement, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

type Props = {
  uri: string;
  poster?: string;
  width: number;
  height: number;
  playing: boolean;
  muted: boolean;
};

/** Feed card video on web — expo-av often crops; HTML video + object-fit is reliable. */
export function FeedWebVideo({ uri, poster, width, height, playing, muted }: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [playing]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

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
    preload: playing ? 'auto' : 'metadata',
    style: {
      width,
      height,
      objectFit: 'cover',
      objectPosition: 'center',
      display: 'block',
      backgroundColor: '#1a1a1a',
    },
  });
}
