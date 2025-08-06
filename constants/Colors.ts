/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    secondary: '#555', // A darker grey for secondary actions in light mode
    primary: '#0a7ea4', // Re-added primary color for light mode
    cardIcon: '#687076', // Icon color for dashboard cards
    border: '#e0e0e0', // Added border color for light mode
    cardBackground: '#f8f8f8', // Light mode card background
    buttonBackground: '#e0e0e0', // Light mode button background
    error: '#FF3B30', // Light mode error color
    inputBackground: '#FAFAFA', // Light mode input background
    placeholder: '#A0A0A0', // Light mode placeholder text
    success: '#D1FAE5', // Light mode success background
    successText: '#065F46', // Light mode success text
    warning: '#FEF3C7', // Light mode warning background
    warningText: '#92400E', // Light mode warning text
    info: '#FECACA', // Light mode info background
    infoText: '#DC2626', // Light mode info text
    secondaryBackground: '#F7FAFC', // Light mode secondary background
    secondaryText: '#718096', // Light mode secondary text
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    secondary: '#BBB', // A lighter grey for secondary actions in dark mode
    primary: '#fff', // Re-added primary color for dark mode
    cardIcon: '#9BA1A6', // Icon color for dashboard cards
    border: '#303030', // Added border color for dark mode
    cardBackground: '#1e1e1e', // Dark mode card background
    buttonBackground: '#2a2a2a', // Dark mode button background
    error: '#FF3B30', // Dark mode error color
    inputBackground: '#2a2a2a', // Dark mode input background
    placeholder: '#6b7280', // Dark mode placeholder text
    success: '#065F46', // Dark mode success background
    successText: '#34D399', // Dark mode success text
    warning: '#92400E', // Dark mode warning background
    warningText: '#FBBF24', // Dark mode warning text
    info: '#7C2D12', // Dark mode info background
    infoText: '#F87171', // Dark mode info text
    secondaryBackground: '#4A5568', // Dark mode secondary background
    secondaryText: '#A0AEC0', // Dark mode secondary text
  },
  red: '#FF3B30', // Added red color
};
