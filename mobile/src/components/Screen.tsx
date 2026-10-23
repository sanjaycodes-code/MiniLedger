import React, { ReactNode, useEffect } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

export interface ScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const WEB_GLOBAL_CSS = `
:root {
  color-scheme: dark;
  accent-color: ${colors.primary};
  --scrollbar-thumb: ${colors.scrollbarThumb};
  --scrollbar-track: ${colors.scrollbarTrack};
  background-color: ${colors.background};
}
html, body, #root {
  background-color: ${colors.background};
  color: ${colors.text};
  margin: 0;
}
::selection {
  background-color: ${colors.selectionBg};
  color: ${colors.text};
}
input:focus {
  outline: none;
}
input[type="date"] {
  color-scheme: dark;
}
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(0.88) brightness(1.1);
  cursor: pointer;
}
* {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}
@supports not (scrollbar-color: auto) {
  *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  *::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 999px;
  }
  *::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }
}
`;

export function Screen({ children, style }: ScreenProps) {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'MiniLedger';
      document.documentElement.style.colorScheme = 'dark';
      document.documentElement.style.backgroundColor = colors.background;
      document.body.style.backgroundColor = colors.background;

      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.setAttribute('name', 'theme-color');
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute('content', colors.background);

      let metaColorScheme = document.querySelector('meta[name="color-scheme"]');
      if (!metaColorScheme) {
        metaColorScheme = document.createElement('meta');
        metaColorScheme.setAttribute('name', 'color-scheme');
        document.head.appendChild(metaColorScheme);
      }
      metaColorScheme.setAttribute('content', 'dark');
    }
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuter}>
        {React.createElement('style', { id: 'miniledger-web-chrome' }, WEB_GLOBAL_CSS)}
        <View style={[styles.webInner, style]}>{children}</View>
      </View>
    );
  }

  return <View style={[styles.nativeContainer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webOuter: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  webInner: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    backgroundColor: colors.background,
  },
});
