import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-4">
            <p className="text-gray-500 text-sm">Algo salio mal. Recarga la pagina para continuar.</p>
            <button
              type="button"
              className="text-sm text-primary-600 underline"
              onClick={() => window.location.reload()}
            >
              Recargar
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
