import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabaseClient';

const { width: screenWidth } = Dimensions.get('window');

// Centralized design tokens
const design = {
  light: {
    bg: '#F7F7FA',
    surface: '#FFFFFF',
    text: '#1F2937',
    subtext: '#6B7280',
    primary: '#3B82F6',
    primaryOn: '#FFFFFF',
    border: '#E5E7EB',
    muted: '#F3F4F6',
    dot: '#3B82F6',
  },
  dark: {
    bg: '#0B0F14',
    surface: '#111827',
    text: '#E5E7EB',
    subtext: '#9CA3AF',
    primary: '#60A5FA',
    primaryOn: '#0B0F14',
    border: '#1F2937',
    muted: '#0F172A',
    dot: '#93C5FD',
  },
  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  space: (n: number) => 4 * n,
};

// Demo images
const images = [
  require('../assets/images/adaptive-icon-square.png'),
  require('../assets/images/adaptive-icon.png'),
  require('../assets/images/favicon.png'),
  require('../assets/images/icon.jpg'),
  require('../assets/images/icon.png'),
  require('../assets/images/jp_logo.png'),
  require('../assets/images/partial-react-logo.png'),
  require('../assets/images/react-logo.png'),
  require('../assets/images/splash-icon.png'),
];

type Role = 'admin' | 'client' | 'worker' | 'viewer' | undefined;

// Reusable Button
function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? design.dark : design.light;

  const base = {
    paddingVertical: design.space(3),
    paddingHorizontal: design.space(5),
    borderRadius: design.radius.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 48,
  };

  const styles = StyleSheet.create({
    primary: {
      ...base,
      backgroundColor: disabled ? `${c.primary}55` : c.primary,
    },
    primaryText: {
      color: c.primaryOn,
      fontWeight: '700',
      fontSize: 16,
    },
    ghost: {
      ...base,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.border,
    },
    ghostText: {
      color: c.text,
      fontWeight: '700',
      fontSize: 16,
    },
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={variant === 'primary' ? styles.primary : styles.ghost}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={variant === 'primary' ? styles.primaryText : styles.ghostText}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// Reusable Section Title
function SectionTitle({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? design.dark : design.light;
  return (
    <Text
      style={{
        fontSize: 22,
        fontWeight: '800',
        color: c.text,
        textAlign: 'center',
        marginBottom: design.space(4),
      }}
    >
      {children}
    </Text>
  );
}

// Feature Card
function FeatureCard({
  title,
  description,
  emoji,
}: {
  title: string;
  description: string;
  emoji: string;
}) {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? design.dark : design.light;
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.surface,
        borderRadius: design.radius.lg,
        padding: design.space(4),
        borderWidth: 1,
        borderColor: c.border,
        marginBottom: design.space(3),
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 24, marginRight: design.space(3) }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{title}</Text>
        <Text
          style={{
            color: c.subtext,
            marginTop: design.space(1),
            lineHeight: 20,
            fontSize: 14,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? design.dark : design.light;

  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let unsub: any;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);
      } finally {
        setLoadingSession(false);
      }
      unsub = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      }).data?.subscription;
    };

    init();

    return () => {
      if (unsub) unsub.unsubscribe();
    };
  }, []);

  const role: Role = session?.user?.user_metadata?.role;

  const goToRoleHome = () => {
    if (!session) return router.replace('/(auth)/login');
    switch (role) {
      case 'admin':
        return router.replace('/(tabs)');
      case 'client':
        return router.replace('/(clients)');
      case 'worker':
        return router.replace('/(workers)');
      default:
        return router.replace('/(auth)/login');
    }
  };

  const handlePrimaryCTA = () => {
    if (session) {
      goToRoleHome();
    } else {
      router.push('/(auth)/login');
    }
  };

  const headerButtonTitle = useMemo(
    () => (session ? 'Dashboard' : 'Sign In'),
    [session]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/* Top Bar */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.brandWrap}>
          <Image
            source={require('../assets/images/icon.png')}
            style={{ width: 40, height: 40, borderRadius: design.radius.md }}
            accessibilityIgnoresInvertColors
          />
        </View>

        {role !== 'viewer' && (
          <Button
            title={headerButtonTitle}
            onPress={() => (session ? goToRoleHome() : router.replace('/(auth)/login'))}
            variant="ghost"
            accessibilityLabel={headerButtonTitle}
          />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: design.space(8) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ paddingHorizontal: design.space(5), paddingTop: design.space(6) }}>
          <Text
            style={{
              color: colors.text,
              fontWeight: '900',
              fontSize: 32,
              letterSpacing: -0.5,
              textAlign: 'center',
            }}
          >
            Transform Your Space
          </Text>
          <Text
            style={{
              color: colors.subtext,
              fontSize: 16,
              textAlign: 'center',
              marginTop: design.space(2),
              lineHeight: 22,
            }}
          >
            High-quality interiors and seamless project execution—crafted by experts.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: design.space(3),
              marginTop: design.space(5),
            }}
          >
            {role !== 'viewer' && (
              <Button
                title={session ? 'Go to Dashboard' : 'Get Started'}
                onPress={handlePrimaryCTA}
                variant="primary"
                accessibilityLabel="Primary call to action"
              />
            )}
            <Button
              title="Browse Gallery"
              onPress={() => router.push('/landing')}
              variant="ghost"
              accessibilityLabel="Browse gallery"
            />
          </View>
        </View>

        {/* Carousel */}
        <View style={{ marginTop: design.space(7) }}>
          <SectionTitle>Selected Works</SectionTitle>
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: screenWidth,
                paddingHorizontal: design.space(4),
              }}
            >
              <Carousel
                loop
                width={screenWidth - design.space(8)}
                height={220}
                autoPlay
                autoPlayInterval={2800}
                scrollAnimationDuration={900}
                data={images}
                onSnapToItem={setCurrentIndex}
                renderItem={({ item, index }) => (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      borderRadius: design.radius.lg,
                      overflow: 'hidden',
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      transform: [{ scale: 0.98 }],
                    }}
                  >
                    <Image
                      source={item}
                      resizeMode="cover"
                      style={{ width: '100%', height: '100%' }}
                      accessibilityIgnoresInvertColors
                    />
                  </View>
                )}
              />
            </View>

            {/* Dots */}
            <View style={{ flexDirection: 'row', marginTop: design.space(3) }}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    marginHorizontal: 4,
                    backgroundColor:
                      i === currentIndex ? colors.dot : `${colors.dot}55`,
                  }}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={{ paddingHorizontal: design.space(5), marginTop: design.space(7) }}>
          <SectionTitle>Why Choose Us</SectionTitle>
          <FeatureCard
            emoji="🏆"
            title="Premium Craftsmanship"
            description="Attention to detail, premium materials, and a finish that lasts."
          />
          <FeatureCard
            emoji="🎯"
            title="Tailored Designs"
            description="Spaces designed around lifestyle, function, and aesthetic goals."
          />
          <FeatureCard
            emoji="🧩"
            title="End-to-End Delivery"
            description="From concept and planning to execution—managed under one roof."
          />
        </View>

        {/* CTA band */}
        <View
          style={{
            marginTop: design.space(8),
            marginHorizontal: design.space(5),
            backgroundColor: colors.surface,
            borderRadius: design.radius.xl,
            padding: design.space(5),
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontWeight: '800',
              fontSize: 20,
              textAlign: 'center',
            }}
          >
            Ready to Start Your Project?
          </Text>
          <Text
            style={{
              color: colors.subtext,
              textAlign: 'center',
              marginTop: design.space(2),
            }}
          >
            Get a free consultation and a custom proposal.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('tel:+917305341479')}
            style={{ marginTop: design.space(3), alignItems: 'center' }}
          >
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
              Call Us: +91 73053 41479
            </Text>
          </TouchableOpacity>
        </View>

        {/* Session Skeleton */}
        {loadingSession && (
          <View
            style={{
              flexDirection: 'row',
              alignSelf: 'center',
              marginTop: design.space(6),
              alignItems: 'center',
              gap: design.space(2),
            }}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.subtext }}>Checking session…</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: design.space(5),
    paddingVertical: design.space(4),
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
