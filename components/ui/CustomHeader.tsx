import { useNavigation, useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabaseClient';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from './IconSymbol';

interface CustomHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightContent?: React.ReactNode;
  showLogoutButton?: boolean;
}

export function CustomHeader({ title, showBackButton = true, rightContent, showLogoutButton = false }: CustomHeaderProps) {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const hasRightContent = rightContent || showLogoutButton;

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: insets.top + 8 },
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background },
      ]}
    >
      {/* Subtle gradient overlay */}
      <View
        style={[
          styles.gradientOverlay,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }
        ]}
      />
      
      <View style={styles.headerContent}>
        {showBackButton && (
          <TouchableOpacity 
            onPress={handleBack} 
            style={[
              styles.backButton,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
            activeOpacity={0.7}
          >
            <IconSymbol
              size={20}
              name="chevron.left"
              color={isDark ? Colors.dark.text : Colors.light.text}
            />
          </TouchableOpacity>
        )}

        <View style={[styles.titleContainer, !showBackButton && styles.titleContainerNoBack]}>
          <Text 
            style={[
              styles.headerTitle, 
              { color: isDark ? Colors.dark.text : Colors.light.text }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {/* Subtle underline accent */}
          <View 
            style={[
              styles.titleAccent,
              { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }
            ]} 
          />
        </View>

        {hasRightContent && (
          <View style={styles.rightContentWrapper}>
            {rightContent}
            {showLogoutButton && (
              <TouchableOpacity 
                style={[
                  styles.logoutButton, 
                  { 
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                  }
                ]} 
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <IconSymbol 
                  size={18} 
                  name="arrow.right.square" 
                  color={isDark ? '#ef4444' : '#dc2626'} 
                />
                <Text 
                  style={[
                    styles.logoutButtonText, 
                    { color: isDark ? '#ef4444' : '#dc2626' }
                  ]}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Bottom border */}
      <View 
        style={[
          styles.bottomBorder,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      },
    }),
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  titleContainerNoBack: {
    alignItems: 'flex-start',
    marginHorizontal: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  titleAccent: {
    height: 2,
    width: 24,
    borderRadius: 1,
    marginTop: 4,
    opacity: 0.8,
  },
  rightContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});