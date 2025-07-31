import { Stack, useNavigation, useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from './IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface CustomHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightContent?: React.ReactNode;
}

export function CustomHeader({ title, showBackButton = true, rightContent }: CustomHeaderProps) {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace('/(tabs)'); // Fallback to home if no back history
    }
  };

  return (
    <View style={[
      styles.headerContainer,
      { paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 0) },
      { backgroundColor: isDark ? Colors.dark.background : Colors.light.background },
      { borderBottomColor: isDark ? Colors.dark.border : Colors.light.border }
    ]}>
      {showBackButton ? (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <IconSymbol size={24} name="chevron.left" color={isDark ? Colors.dark.text : Colors.light.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButtonPlaceholder} />
      )}
      <Text style={[styles.headerTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        {title}
      </Text>
      <View style={styles.rightContentContainer}>
        {rightContent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
    marginLeft: -8, // Adjust to align icon visually
  },
  backButtonPlaceholder: {
    width: 40, // Match back button width for alignment
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  rightContentContainer: {
    width: 40, // Match back button width for alignment
    alignItems: 'flex-end',
  },
});
