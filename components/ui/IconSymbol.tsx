// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'plus.circle.fill': 'add-circle',
  'square.and.arrow.up.fill': 'file-upload',
  'trash.fill': 'delete',
  'pencil': 'edit',
  'clock': 'history',
  'clock.fill': 'access-time', // Added mapping for clock.fill
  'checkmark.circle.fill': 'check-circle',
  'arrow.clockwise': 'refresh',
  'person.crop.circle.badge.plus': 'person-add', // Added mapping for person.crop.circle.badge.plus
  'pencil.circle.fill': 'edit', // Added mapping for pencil.circle.fill
  'person.circle.fill': 'person', // Added mapping for person.circle.fill
  'person.3.fill': 'people', // Added mapping for person.3.fill
  'checklist.unchecked': 'assignment', // Added mapping for checklist.unchecked
  'doc.text.fill': 'description', // Added mapping for doc.text.fill
  'checkmark.seal.fill': 'verified', // Added mapping for checkmark.seal.fill
  'photo.fill.on.rectangle.fill': 'photo-library', // Added mapping for photo.fill.on.rectangle.fill
} as const;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
