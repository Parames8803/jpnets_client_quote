import { CustomHeader } from '@/components/ui/CustomHeader';
import { Stack } from 'expo-router';

export default function WorkersLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          header: (props) => <CustomHeader title="Worker Dashboard" {...props} showLogoutButton={true} showBackButton={false} />,
        }} 
      />
    </Stack>
  );
}
