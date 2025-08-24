import { CustomHeader } from '@/components/ui/CustomHeader';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Tabs } from 'expo-router';

export default function AuthLayout() {
  const colorScheme = useColorScheme();
      const isDark = colorScheme === 'dark';
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors['light'].tint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
          borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
        },
      }}
    >
      <Tabs.Screen
        name="login"
        options={{
          title: 'Login',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name={focused ? 'person.fill' : 'person'} color={color} size={24} />
          ),
          headerShown: true,
          header: () => <CustomHeader title="Login" showBackButton={false} showLogoutButton={false} />,
        }}
      />
    </Tabs>
  );
}
