import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Home, UtensilsCrossed, Users, CalendarDays, MapPin, ShoppingBag, User } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useCart } from "@/hooks/useCart";

function TabIcon({ Icon, color, focused, badge }: { Icon: React.ElementType; color: string; focused: boolean; badge?: number }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
      {badge != null && badge > 0 && (
        <View style={styles.iconBadge}>
          <Icon size={0} color="transparent" />
        </View>
      )}
    </View>
  );
}

function TabIconWithBadge({ Icon, color, focused, count }: { Icon: React.ElementType; color: string; focused: boolean; count: number }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
      {count > 0 && (
        <View style={styles.badge}>
          <Icon size={0} color="transparent" />
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { itemCount } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarBackground: () => <View style={styles.tabBarBg} />,
        tabBarScrollEnabled: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Главная",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Home} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Меню",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={UtensilsCrossed} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Корзина",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={ShoppingBag} color={color} focused={focused} />,
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: styles.tabBadge,
        }}
      />
      <Tabs.Screen
        name="banquet"
        options={{
          title: "Банкет",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Users} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: "Резерв",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={CalendarDays} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Контакты",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={MapPin} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Профиль",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={User} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderTopWidth: 0,
    elevation: 0,
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  tabBarBg: {
    flex: 1,
    backgroundColor: Colors.surface1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  label: {
    fontSize: 9,
    fontWeight: "500" as const,
    letterSpacing: 0.3,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 28,
    borderRadius: 8,
  },
  iconWrapActive: {
    backgroundColor: `${Colors.gold}18`,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.surface1,
  },
  tabBadge: {
    backgroundColor: Colors.gold,
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.bg,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
