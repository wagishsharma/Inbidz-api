import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { showAlert } from '@/lib/alert';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';

export default function ShopSetupScreen() {
  const { accessToken, refreshUser } = useAuth();
  const [shopName, setShopName] = useState('');
  const [shippingPolicy, setShippingPolicy] = useState('');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getShop(accessToken ?? '')
      .then((res) => {
        if (res.setupComplete && res.shopName) {
          setShopName(res.shopName);
          setComplete(true);
        }
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const finish = async () => {
    if (!shopName.trim()) {
      showAlert('Shop name required', 'Enter a name for your shop to continue.');
      return;
    }
    setSubmitting(true);
    try {
      await api.shopSetup(accessToken ?? '', shopName.trim(), shippingPolicy.trim() || undefined);
      await api.trackOnboarding(accessToken ?? '', 'shop_setup_complete');
      await refreshUser();
      setComplete(true);
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={shared.screenCenter}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (complete) {
    return (
      <View style={styles.container}>
        <Card>
          <Text style={styles.title}>Shop ready</Text>
          <Text style={styles.hint}>You can now add commerce to your posts.</Text>
          <Text style={styles.summary}>{shopName}</Text>
          <Pressable style={styles.btn} onPress={() => router.replace('/(tabs)/create')}>
            <Text style={styles.btnText}>Create post</Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={() => router.back()}>
            <Text style={styles.btnTextSecondary}>Done</Text>
          </Pressable>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Set up your shop</Text>
        <Text style={styles.step}>Step {step} of 3</Text>

        {step === 1 && (
          <>
            <Field
              label="Shop name"
              placeholder="What should buyers call your shop?"
              value={shopName}
              onChangeText={setShopName}
            />
            <Pressable
              style={[styles.btn, !shopName.trim() && styles.btnDisabled]}
              onPress={() => setStep(2)}
              disabled={!shopName.trim()}
            >
              <Text style={styles.btnText}>Continue</Text>
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <Field
              label="Shipping policy"
              placeholder="Ships in 3–5 days across India..."
              value={shippingPolicy}
              onChangeText={setShippingPolicy}
              multiline
              style={styles.multiline}
            />
            <Pressable style={styles.btn} onPress={() => setStep(3)}>
              <Text style={styles.btnText}>Continue</Text>
            </Pressable>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.reviewLabel}>Review</Text>
            <Text style={styles.summary}>{shopName}</Text>
            <Text style={styles.hint}>
              Payout KYC connects to your INBIDZ account when you go live.
            </Text>
            <Pressable style={styles.btn} onPress={finish} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.btnText}>Open my shop</Text>
              )}
            </Pressable>
          </>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  content: {
    padding: layout.contentPadding,
  },
  title: shared.h1,
  step: {
    ...shared.subtitle,
    marginBottom: sp(20),
  },
  reviewLabel: shared.fieldLabel,
  multiline: { minHeight: sp(96), textAlignVertical: 'top' },
  btn: {
    ...shared.btnPrimary,
    marginTop: sp(4),
  },
  btnDisabled: { opacity: 0.5 },
  btnSecondary: {
    ...shared.btnOutline,
    marginTop: sp(12),
  },
  btnText: shared.btnPrimaryText,
  btnTextSecondary: shared.btnOutlineText,
  summary: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fs(16),
    fontWeight: '600',
    marginBottom: sp(8),
  },
  hint: {
    ...shared.subtitle,
    marginBottom: sp(20),
  },
});
