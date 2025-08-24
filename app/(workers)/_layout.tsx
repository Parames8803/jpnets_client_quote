import { CustomHeader } from '@/components/ui/CustomHeader';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Tabs } from 'expo-router';

export default function WorkersLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? Colors.dark.tint : Colors.light.tint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
          borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name={focused ? 'house.fill' : 'house'} color={color} size={24} />
          ),
          headerShown: true,
          header: () => <CustomHeader title="Worker Dashboard" showBackButton={false} showLogoutButton={true} />,
        }}
      />
    </Tabs>
  );
}
