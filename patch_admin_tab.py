import re

with open("src/components/layout/AdminTabBar.tsx", "r") as f:
    c = f.read()

c = c.replace("import { LayoutDashboard, Bell, Settings, ShieldAlert } from 'lucide-react-native';", "import { LayoutDashboard, User, Settings, ShieldAlert } from 'lucide-react-native';")

c = re.sub(r"const pulseAnim = useRef\(new Animated.Value\(1\)\).current;.*?\n", "", c)

c = re.sub(r"const tabs = \[\s*\{.*?\},\s*\{.*?\},\s*\];", """const tabs = [
    { name: 'Dashboard', label: 'Home', icon: LayoutDashboard, routeIndex: 0 },
    { name: 'Profile', label: 'Profile', icon: User, routeIndex: 1 },
    { name: 'Settings', label: 'Settings', icon: Settings, routeIndex: 2 },
  ];""", c, flags=re.DOTALL)

c = re.sub(r"const centerTab = \{ name: 'Notifications'.*?\n", "", c)

c = re.sub(r"const Tab0Icon = tabs\[0\].icon;\s*const Tab1Icon = tabs\[1\].icon;\s*const CenterIcon = centerTab.icon;", "", c)

new_return = """    <Animated.View
      pointerEvents={isTabBarVisible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          transform: [{ translateY: tabBarTranslate || new Animated.Value(0) }],
          opacity: animatedOpacity,
        },
        !isTabBarVisible && styles.hiddenBar,
      ]}
    >
      <View style={styles.backgroundContainer}>
        <View style={styles.curvedBar}>
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const isFocused = state.index === tab.routeIndex;
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => onNavigate(tab.routeIndex)}
                style={styles.tabItem}
                activeOpacity={0.6}
              >
                <IconComponent
                  size={sizes.iconSize}
                  color={isFocused ? COLORS.active : COLORS.inactive}
                  strokeWidth={isFocused ? 2.5 : 2}
                />
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Animated.View>"""

c = re.sub(r"<Animated\.View\s+pointerEvents=\{isTabBarVisible \? 'auto' : 'none'\}.*?</Animated\.View>", new_return, c, flags=re.DOTALL)

with open("src/components/layout/AdminTabBar.tsx", "w") as f:
    f.write(c)

