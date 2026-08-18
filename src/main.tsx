import { Component, ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error("CampusBite UI Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F6F2EA", fontFamily: "sans-serif", padding: "20px" }}>
          <div style={{ maxWidth: "500px", width: "100%", backgroundColor: "white", padding: "32px", borderRadius: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.1)", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#0B1F16", margin: "0 0 8px 0" }}>Something went wrong</h2>
            <p style={{ fontSize: "14px", color: "#666", lineHeight: "1.5", marginBottom: "24px" }}>
              {this.state.error?.message || "An unexpected error occurred while rendering the application."}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{ backgroundColor: "#14532D", color: "white", border: "none", padding: "12px 24px", borderRadius: "9999px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
