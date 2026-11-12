import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Chronica ErrorBoundary] Uncaught runtime error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      // Pulisci tutte le chiavi relative a Chronica per un ripristino sicuro al 100%
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('chronica_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Errore pulizia localStorage:', e);
    }
    window.location.href = window.location.origin + window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-red-900/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-700/80 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-red-200">
                  Si è verificato un errore imprevisto
                </h1>
                <p className="text-xs font-mono text-slate-400">
                  La schermata è stata interrotta per proteggere la sessione
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 font-serif leading-relaxed mb-6">
              Un errore di rendering o memoria del browser ha impedito il caricamento dell&apos;interfaccia.
              Non preoccuparti: puoi ricaricare subito la sessione o ripristinare il tavolo di gioco per ripartire in sicurezza.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left font-mono text-xs text-red-300 overflow-x-auto max-h-36">
                <strong>{this.state.error.name}:</strong> {this.state.error.message}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="py-3 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white font-serif font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ricarica Schermata</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="py-3 px-4 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-200 font-serif font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ripristina Tavolo e Riavvia</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
