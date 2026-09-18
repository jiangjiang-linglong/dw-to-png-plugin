export enum ErrorSeverity {
  LOW = 'low', MEDIUM = 'medium', HIGH = 'high', INFO = 'info',
  WARNING = 'warning', ERROR = 'error', CRITICAL = 'critical'
}

export interface ErrorLog {
  id: string;
  timestamp: number;
  severity: ErrorSeverity;
  message: string;
  details?: Record<string, any>;
  stackTrace?: string;
  context?: Record<string, any>;
}

class ErrorCollector {
  private errorLogs: ErrorLog[] = [];
  private maxLogs = 1000;

  logError(severity: ErrorSeverity, message: string, options?: {
    details?: Record<string, any>; error?: Error; context?: Record<string, any>;
  }): string {
    const { details, error, context } = options || {};
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      severity,
      message,
      details,
      stackTrace: error?.stack,
      context: { ...context, userAgent: navigator.userAgent, language: navigator.language, url: window.location.href }
    };
    this.errorLogs.push(errorLog);
    if (this.errorLogs.length > this.maxLogs) this.errorLogs.shift();
    this.consoleLog(errorLog);
    return errorLog.id;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private consoleLog(errorLog: ErrorLog): void {
    const { severity, message, details, stackTrace } = errorLog;
    const prefix = `[${severity.toUpperCase()}] ${message}`;
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.ERROR:
        console.error(prefix, details || '', stackTrace || '');
        break;
      case ErrorSeverity.WARNING:
        console.warn(prefix, details || '');
        break;
      case ErrorSeverity.INFO:
        console.info(prefix, details || '');
        break;
    }
  }

  getErrorLogs(): ErrorLog[] { return [...this.errorLogs]; }
  getErrorLogsBySeverity(severity: ErrorSeverity): ErrorLog[] { return this.errorLogs.filter(log => log.severity === severity); }
  clearErrorLogs(): void { this.errorLogs = []; }
  exportErrorLogs(): string { return JSON.stringify(this.errorLogs, null, 2); }

  downloadErrorLogs(): void {
    const dataStr = this.exportErrorLogs();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  captureApiError(message: string, options?: {
    details?: Record<string, any>; error?: Error; context?: Record<string, any>; severity?: ErrorSeverity;
  }): string {
    const { details, error, context, severity = ErrorSeverity.MEDIUM } = options || {};
    return this.logError(severity, message, { details, error, context });
  }

  captureExportError(message: string, options?: {
    details?: Record<string, any>; error?: Error; context?: Record<string, any>;
  }): string {
    const { details, error, context } = options || {};
    return this.logError(ErrorSeverity.ERROR, message, { details, error, context });
  }

  reportErrorToServer(): Promise<void> {
    return Promise.resolve();
  }
}

export default new ErrorCollector();
