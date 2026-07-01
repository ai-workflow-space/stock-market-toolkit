import { Component, type ReactNode } from "react";
import i18n from "@/i18n";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">{i18n.t("common.errorBoundary.title")}</h1>
            <p className="text-muted-foreground text-sm">
              {i18n.t("common.errorBoundary.description")}
            </p>
            {import.meta.env.DEV && this.state.error && (
              <p className="text-xs text-muted-foreground font-mono mt-2">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button onClick={this.handleReload} variant="default">
            {i18n.t("common.errorBoundary.reload")}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
