import { router } from 'expo-router';

/** Leave fullscreen immersive (modal on stack). Works on web where `back()` can no-op. */
export function closeImmersiveView(): void {
  if (typeof router.dismiss === 'function') {
    router.dismiss();
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)');
}
