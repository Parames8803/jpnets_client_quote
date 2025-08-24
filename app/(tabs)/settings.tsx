import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.optionButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
          onPress={() => router.push('/gallery')}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>Update Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
          onPress={() => router.push('/register')}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>Create Admin Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  optionButton: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
