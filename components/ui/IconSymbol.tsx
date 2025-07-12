// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolViewProps, SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<
  SymbolViewProps["name"],
  ComponentProps<typeof MaterialIcons>["name"]
>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "museum.fill": "museum",
  pencil: "edit",
  trash: "delete",
  "person.3.sequence.fill": "group",
  plus: "add",
  xmark: "close",
  "server.rack": "storage",
  "calendar.badge.clock": "schedule",
  "folder.fill.badge.person.crop": "folder",
  checklist: "checklist",
  "folder.fill": "folder",
  "clock.fill": "schedule",
  "eye.fill": "visibility",
  "checkmark.circle.fill": "check-circle",
  "circle.fill": "circle",
  "exclamationmark.triangle.fill": "warning",
  "arrow.clockwise": "refresh",
  "star.fill": "star",
  "chart.line.uptrend.xyaxis": "trending-up",
  "person.3.fill": "group",
  "person.fill": "person",
  "trophy.fill": "emoji-events",
  "medal.fill": "military-tech",
} as unknown as IconMapping;

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
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
