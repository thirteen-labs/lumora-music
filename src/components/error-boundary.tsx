import { Component, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({
      errorInfo: errorInfo?.componentStack ?? null,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  getErrorMessage(): string {
    const { error } = this.state;
    if (!error) return 'An unexpected error occurred';
    if (error.message) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'An unknown error occurred';
    }
  }

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
          <ScrollView
            contentContainerStyle={{
              alignItems: 'center',
              maxWidth: 400,
            }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
              Something went wrong
            </Text>
            <Text
              style={{
                color: '#ccc',
                fontSize: 13,
                textAlign: 'center',
                marginBottom: 8,
                lineHeight: 18,
              }}
              selectable
            >
              {this.getErrorMessage()}
            </Text>
            {this.state.error?.name && (
              <Text
                style={{
                  color: '#666',
                  fontSize: 11,
                  textAlign: 'center',
                  marginBottom: 24,
                  fontFamily: 'monospace',
                }}
              >
                {this.state.error.name}
              </Text>
            )}
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
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}
