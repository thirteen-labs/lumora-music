import { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0A0A0F',
            padding: 24,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </Text>
          <Pressable
            onPress={this.handleRetry}
            style={{
              backgroundColor: '#8B5CF6',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
