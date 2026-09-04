"use client";

import { Component, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  onReset: () => void;
}

interface State {
  hasError: boolean;
}

/**
 * A crash inside the chat window (e.g. a browser feature like auto-translate
 * mutating the DOM nodes React is streaming tokens into) shouldn't take the
 * whole page down with it - this catches it and offers a reset of just the
 * chat widget instead of a fully broken tab.
 */
export class ChatErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Chat widget crashed:", error);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="border-accent/40 bg-surface glow-border-strong flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center">
          <p className="font-display text-sm font-bold tracking-wide uppercase">Signal lost</p>
          <p className="text-foreground/60 text-sm">
            The chat hit an unexpected error. Restarting it should pick up right where you left off.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="bg-accent text-accent-foreground inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide uppercase"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Restart chat
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
