import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fs, shared, sp } from '@/constants/theme';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const GOALS = [
  { id: 'learn', label: 'Learn' },
  { id: 'teach', label: 'Teach' },
  { id: 'sell', label: 'Sell' },
  { id: 'explore', label: 'Explore' },
];

export default function GrowthGuideScreen() {
  const { user, accessToken } = useAuth();
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await api.getGrowthBrief(accessToken);
      setBrief(res.brief);
      if (Array.isArray(res.brief?.creatorGoals)) {
        setSelectedGoals(res.brief.creatorGoals as string[]);
      }
    } catch (e) {
      console.warn('Growth guide load failed', e);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const saveGoals = async () => {
    if (!accessToken) return;
    const goals = selectedGoals.length ? selectedGoals : ['explore'];
    const res = await api.saveGrowthPreferences(accessToken, {
      creatorGoals: goals,
      dismissedIntentPrompt: true,
    });
    if (res.brief) setBrief(res.brief);
  };

  const openCta = (path?: string) => {
    if (!path) return;
    if (path.startsWith('http')) {
      Linking.openURL(path);
      return;
    }
    router.push(path as '/(tabs)/create');
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Sign in to view your growth guide.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (brief?.needsIntentPrompt) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>What matters most for you?</Text>
        <View style={styles.goalGrid}>
          {GOALS.map((g) => {
            const active = selectedGoals.includes(g.id);
            return (
              <Pressable
                key={g.id}
                style={[styles.goalChip, active && styles.goalChipActive]}
                onPress={() =>
                  setSelectedGoals((prev) =>
                    prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id]
                  )
                }
              >
                <Text style={[styles.goalText, active && styles.goalTextActive]}>{g.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.primaryBtn} onPress={saveGoals}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const primary = brief?.primaryAction as Record<string, string> | undefined;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Growth Guide</Text>

      {primary && (
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Your next step</Text>
          <Text style={styles.heroTitle}>{primary.title}</Text>
          <Text style={styles.heroWhy}>{primary.why}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => openCta(primary.ctaPath)}>
            <Text style={styles.primaryBtnText}>{primary.title}</Text>
          </Pressable>
        </View>
      )}

      {Array.isArray(brief?.opportunityMatches) &&
        (brief.opportunityMatches as Record<string, string>[]).map((m, i) => (
          <Pressable key={i} style={styles.card} onPress={() => openCta(m.ctaPath)}>
            <Text style={styles.cardType}>{m.type}</Text>
            <Text style={styles.cardTitle}>{m.title}</Text>
            <Text style={styles.cardWhy}>{m.whyFit}</Text>
          </Pressable>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  content: { padding: sp(16), paddingBottom: sp(48) },
  center: { ...shared.screen, flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#6b7280' },
  back: { marginBottom: sp(8) },
  backText: { color: colors.accent, fontSize: fs(14) },
  title: { fontSize: fs(22), fontWeight: '700', color: '#111', marginBottom: sp(16) },
  hero: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: sp(16),
    marginBottom: sp(20),
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  heroLabel: { fontSize: fs(10), fontWeight: '700', color: '#047857', textTransform: 'uppercase' },
  heroTitle: { fontSize: fs(18), fontWeight: '600', color: '#111', marginTop: sp(4) },
  heroWhy: { fontSize: fs(14), color: '#4b5563', marginTop: sp(8), lineHeight: fs(20) },
  primaryBtn: {
    marginTop: sp(12),
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: sp(12),
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: fs(14) },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(8), marginBottom: sp(20) },
  goalChip: {
    paddingHorizontal: sp(14),
    paddingVertical: sp(10),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  goalChipActive: { borderColor: colors.accent, backgroundColor: '#ecfdf5' },
  goalText: { fontSize: fs(14), color: '#374151' },
  goalTextActive: { color: '#047857', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: sp(14),
    marginBottom: sp(10),
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardType: { fontSize: fs(10), color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' },
  cardTitle: { fontSize: fs(15), fontWeight: '600', color: '#111', marginTop: sp(4) },
  cardWhy: { fontSize: fs(13), color: '#6b7280', marginTop: sp(4) },
});
