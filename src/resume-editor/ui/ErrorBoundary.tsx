import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "#e2e8f0",
            background: "#0f172a",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#94a3b8" }}>Reload the page to try again.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.5rem",
              cursor: "pointer",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
