import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import type { Post } from '@inbidz/shared';
import { PostCard } from '@/components/PostCard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';

export default function ExploreScreen() {
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const grid = Platform.OS === 'web';

  useEffect(() => {
    api
      .getFeed(accessToken, 30, 0)
      .then((res) => {
        const commerce = res.posts.filter((p) => p.commerceMode !== 'none');
        const endingSoon = commerce.filter((p) => {
          const end = p.commerce?.auctionEnd;
          if (!end) return false;
          const hours = (new Date(end).getTime() - Date.now()) / 3600000;
          return hours > 0 && hours < 24;
        });
        setPosts([...endingSoon, ...commerce.filter((p) => !endingSoon.includes(p))]);
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) {
    return (
      <View style={shared.screenCenter}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={posts}
      keyExtractor={(item) => item.id}
      numColumns={grid ? 2 : 1}
      key={grid ? 'grid' : 'list'}
      columnWrapperStyle={grid ? styles.gridRow : undefined}
      contentContainerStyle={grid ? styles.listGrid : styles.list}
      ListHeaderComponent={
        posts.length > 0 ? <Text style={styles.header}>For sale</Text> : null
      }
      ListEmptyComponent={<Text style={styles.empty}>No listings yet</Text>}
      renderItem={({ item }) => (
        <View style={grid ? styles.gridItem : styles.listItem}>
          <PostCard post={item} compact={grid} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  header: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: fs(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: layout.contentPadding,
    paddingTop: sp(8),
    paddingBottom: sp(8),
  },
  list: {
    paddingHorizontal: layout.contentPadding,
    paddingBottom: sp(24),
    gap: sp(10),
  },
  listItem: {
    marginBottom: sp(10),
  },
  listGrid: {
    paddingHorizontal: sp(12),
  },
  gridRow: {
    gap: sp(12),
    paddingHorizontal: sp(4),
    marginBottom: sp(12),
  },
  gridItem: { flex: 1 },
  empty: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    textAlign: 'center',
    padding: sp(48),
    fontSize: fs(14),
  },
});
