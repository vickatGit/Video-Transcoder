import React from "react";
import Error from "./Error";

interface Props {
  children: React.ReactNode;
  type: string;
}
interface State {
  hasError: boolean;
  error: any;
  errorInfo: any;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // You can also log the error to an error reporting service
    this.setState({ error, errorInfo: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return this.props.type === "notification" ? (
        <div className="ml-3 text-sm grow">Some Error occured</div>
      ) : (
        <Error error={this.state.error} errorInfo={this.state.errorInfo} />
      );
    } else {
      return (this.props as any).children;
    }
  }
}

export default ErrorBoundary;
