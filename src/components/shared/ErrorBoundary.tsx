import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { C } from "../../data/prototype/designTokens";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", background: C.cream, padding: 26, fontFamily: "sans-serif"
        }}>
          <div style={{
            background: C.ivory, padding: 32, borderRadius: 8, border: `1px solid ${C.stone}`,
            maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center"
          }}>
            <AlertTriangle size={32} color={C.coral} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Something went wrong.</div>
              <div style={{ fontSize: 14, color: C.slate }}>
                An unexpected error has occurred. Please reload the application to continue.
              </div>
            </div>
            <button 
              onClick={this.handleReload}
              style={{
                background: C.ink, color: C.ivory, border: "none", padding: "10px 20px", borderRadius: 4, 
                fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, marginTop: 8
              }}
            >
              <RefreshCw size={14} /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
