import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import type { FeedMode, Post } from '@inbidz/shared';
import { ImmersiveFeedViewer } from '@/components/ImmersiveFeedViewer';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { peekImmersiveFeedSession } from '@/lib/immersive-feed';

export default function ImmersivePostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, login } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const [feedMode, setFeedMode] = useState<FeedMode>(
    () => peekImmersiveFeedSession()?.feedMode ?? 'for_you'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const session = peekImmersiveFeedSession();
    const sessionFeedMode = session?.feedMode ?? 'for_you';
    if (session?.posts.length) {
      const idx = session.posts.findIndex((p) => p.id === id);
      setPosts(session.posts);
      setInitialIndex(idx >= 0 ? idx : session.initialIndex);
      setFeedMode(sessionFeedMode);
      setLoading(false);
      return;
    }

    Promise.all([api.getFeed(accessToken, 30, 0, sessionFeedMode), api.getPost(id, accessToken)])
      .then(([feed, detail]) => {
        let list = feed.posts;
        if (!list.some((p) => p.id === id)) {
          list = [detail.post, ...list];
        }
        setPosts(list);
        setInitialIndex(Math.max(0, list.findIndex((p) => p.id === id)));
      })
      .catch(async () => {
        const detail = await api.getPost(id, accessToken);
        setPosts([detail.post]);
        setInitialIndex(0);
      })
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  if (loading || posts.length === 0) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <ImmersiveFeedViewer
        posts={posts}
        initialIndex={initialIndex}
        accessToken={accessToken}
        feedMode={feedMode}
        onLogin={login}
        onPostsChange={setPosts}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
