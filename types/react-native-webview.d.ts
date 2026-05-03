declare module 'react-native-webview' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface WebViewProps extends ViewProps {
    source?: { uri?: string; html?: string };
    originWhitelist?: string[];
  }

  export const WebView: ComponentType<WebViewProps>;
}
