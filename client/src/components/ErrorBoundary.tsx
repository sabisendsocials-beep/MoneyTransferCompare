import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console but don't show popup
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Suppress JSON parse errors and similar runtime errors
    if (error.message.includes('JSON') || 
        error.message.includes('undefined is not valid') ||
        error.message.includes('SyntaxError')) {
      // Silently handle these errors
      return;
    }
  }

  render() {
    if (this.state.hasError) {
      // Return null to hide the component instead of showing error UI
      // This prevents the popup from appearing
      return null;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;