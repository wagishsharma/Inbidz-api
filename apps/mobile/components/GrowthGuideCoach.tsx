import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fs, sp } from '@/constants/theme';
import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

type PrimaryAction = {
  title: string;
  why: string;
  ctaPath: string;
  ctaKind: string;
  actionKey: string;
  completionMode: string;
};

const HIDE_ON = ['/growth-guide'];

export default function GrowthGuideCoach() {
  const { user, accessToken } = useAuth();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState<PrimaryAction | null>(null);
  const [loading, setLoading] = useState(false);

  const hidden = HIDE_ON.some((p) => pathname?.includes(p));

  const load = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      const data = await api.getGrowthCoach(accessToken);
      if (data.primaryAction) setAction(data.primaryAction);
    } catch {
      /* silent */
    }
  }, [user, accessToken]);

  useEffect(() => {
    if (user && !hidden) load();
  }, [user, hidden, pathname, load]);

  const runCta = () => {
    if (!action) return;
    setExpanded(false);
    const path = action.ctaPath;
    if (path.startsWith('http')) {
      Linking.openURL(path);
      return;
    }
    router.push(path as '/shop/setup');
  };

  const markDone = async () => {
    if (!action || !accessToken) return;
    setLoading(true);
    try {
      const data = await api.completeGrowthAction(accessToken, action.actionKey);
      if (data.primaryAction) setAction(data.primaryAction as PrimaryAction);
      else await load();
    } finally {
      setLoading(false);
    }
  };

  if (!user || hidden || !action) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {expanded ? (
        <View style={styles.panel}>
          <Text style={styles.heading}>Growth Guide</Text>
          <Text style={styles.why}>{action.why}</Text>
          <Pressable style={styles.cta} onPress={runCta}>
            <Text style={styles.ctaText}>{action.title}</Text>
          </Pressable>
          {action.completionMode === 'manual' && (
            <Pressable onPress={markDone} disabled={loading}>
              <Text style={styles.doneText}>{loading ? 'Saving…' : "I've done this"}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/growth-guide')}>
            <Text style={styles.link}>See full guide</Text>
          </Pressable>
          <Pressable style={styles.collapse} onPress={() => setExpanded(false)}>
            <Text style={styles.collapseText}>›</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.tab} onPress={() => setExpanded(true)}>
          <Text style={styles.tabIcon}>✦</Text>
          <Text style={styles.tabChevron}>‹</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: sp(8),
    top: '42%',
    zIndex: 100,
  },
  tab: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: sp(10),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabIcon: { fontSize: fs(18), color: colors.accent },
  tabChevron: { fontSize: fs(12), color: '#6b7280', marginTop: 2 },
  panel: {
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: sp(12),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  heading: { fontSize: fs(12), fontWeight: '700', color: '#111', textAlign: 'center' },
  why: { fontSize: fs(11), color: '#4b5563', marginTop: sp(8), lineHeight: fs(16) },
  cta: {
    marginTop: sp(10),
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: sp(10),
    paddingHorizontal: sp(8),
  },
  ctaText: { color: '#fff', fontSize: fs(12), fontWeight: '600', textAlign: 'center' },
  doneText: {
    marginTop: sp(8),
    fontSize: fs(11),
    color: '#6b7280',
    textAlign: 'center',
  },
  link: {
    marginTop: sp(10),
    fontSize: fs(10),
    color: colors.accent,
    textAlign: 'center',
  },
  collapse: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseText: { color: '#fff', fontSize: fs(12) },
});
