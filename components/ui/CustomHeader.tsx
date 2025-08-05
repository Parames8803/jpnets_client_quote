import { useNavigation, useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabaseClient'; // Import supabase

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from './IconSymbol';

interface CustomHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightContent?: React.ReactNode;
  showLogoutButton?: boolean; // New prop for logout button
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
      // Fallback to the home tab if there's no back history
      router.replace('/(tabs)');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: insets.top },
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background },
        { borderBottomColor: isDark ? Colors.dark.border : Colors.light.border },
      ]}
    >
      {showBackButton && (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <IconSymbol
            size={24}
            name="chevron.left"
            color={isDark ? Colors.dark.text : Colors.light.text}
          />
        </TouchableOpacity>
      )}

      <Text style={[styles.headerTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        {title}
      </Text>

      <View style={styles.rightContentWrapper}>
        {rightContent && (
          <View style={styles.rightContentContainer}>
            {rightContent}
          </View>
        )}
        {showLogoutButton && (
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]} onPress={handleLogout}>
            <IconSymbol size={20} name="arrow.right.square" color={isDark ? Colors.dark.error : Colors.light.error} />
            <Text style={[styles.logoutButtonText, { color: isDark ? Colors.dark.error : Colors.light.error }]}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Platform.OS === 'android' ? 60 : 50,
    paddingHorizontal: 16,
    // Using a shadow for a more modern, floating effect
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      },
    }),
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 1, // Ensure the button is above the title
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    // The title is now centered by the headerContainer, so we don't need absolute positioning
  },
  rightContentWrapper: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rightContentContainer: {
    // This container is now part of rightContentWrapper, so its positioning might need adjustment
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
