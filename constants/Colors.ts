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
  },
  red: '#FF3B30', // Added red color
};
