import React, { Component } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';

/**
 * ErrorBoundary组件 - 错误边界组件
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      errorInfo,
      error
    });

    // 错误日志上报
    this.logError(error, errorInfo);

    // 调用自定义错误处理
    this.props.onError?.(error, errorInfo);
  }

  logError = (error, errorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 控制台输出
    console.error('ErrorBoundary caught an error:', errorData);

    // 可以添加错误上报服务
    // this.reportError(errorData);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleCopyError = () => {
    const errorText = `
Error ID: ${this.state.errorId}
Message: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      // 可以显示复制成功的提示
      alert('错误信息已复制到剪贴板');
    });
  };

  render() {
    if (this.state.hasError) {
      const { 
        fallback,
        showDetails = false,
        showReload = true,
        showReset = true,
        showCopy = true,
        className = '',
        title = '出现了一些问题',
        message = '应用程序遇到了一个错误，请刷新页面或稍后再试。',
        ...rest 
      } = this.props;

      // 自定义错误界面
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback(this.state.error, this.state.errorInfo, this.handleReset)
          : fallback;
      }

      return (
        <div 
          className={clsx(
            'flex flex-col items-center justify-center min-h-screen p-8 bg-gray-900 text-gray-100',
            className
          )}
          {...rest}
        >
          {/* 错误图标 */}
          <div className="mb-6">
            <Icon name="AlertTriangle" size="4xl" className="text-red-400" />
          </div>

          {/* 错误标题 */}
          <h1 className="text-2xl font-bold text-gray-100 mb-2">
            {title}
          </h1>

          {/* 错误消息 */}
          <p className="text-gray-400 text-center mb-8 max-w-md">
            {message}
          </p>

          {/* 错误ID */}
          {this.state.errorId && (
            <div className="mb-6 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <span className="text-xs text-gray-500">错误ID: </span>
              <code className="text-xs text-gray-300">{this.state.errorId}</code>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {showReload && (
              <Button 
                onClick={this.handleReload}
                icon="RotateCcw"
                variant="solid"
                color="blue"
              >
                刷新页面
              </Button>
            )}
            
            {showReset && (
              <Button 
                onClick={this.handleReset}
                icon="RefreshCw"
                variant="outline"
                color="gray"
              >
                重试
              </Button>
            )}

            {showCopy && (
              <Button 
                onClick={this.handleCopyError}
                icon="Copy"
                variant="outline"
                color="gray"
              >
                复制错误信息
              </Button>
            )}
          </div>

          {/* 错误详情 */}
          {showDetails && this.state.error && (
            <details className="w-full max-w-2xl">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400 mb-2">
                查看错误详情
              </summary>
              <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
                <div className="space-y-4">
                  {/* 错误信息 */}
                  <div>
                    <h3 className="text-sm font-medium text-red-400 mb-2">
                      错误信息
                    </h3>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                      {this.state.error.toString()}
                    </pre>
                  </div>

                  {/* 堆栈信息 */}
                  {this.state.error.stack && (
                    <div>
                      <h3 className="text-sm font-medium text-red-400 mb-2">
                        堆栈信息
                      </h3>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}

                  {/* 组件堆栈 */}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <h3 className="text-sm font-medium text-red-400 mb-2">
                        组件堆栈
                      </h3>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </details>
          )}

          {/* 帮助链接 */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              如果问题持续存在，请联系技术支持或提交问题报告
            </p>
            <div className="mt-2 flex gap-4 justify-center">
              <a 
                href="mailto:support@example.com" 
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                联系支持
              </a>
              <a 
                href="https://github.com/your-repo/issues" 
                className="text-sm text-blue-400 hover:text-blue-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                提交问题
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for error handling
export const useErrorHandler = () => {
  const handleError = (error, errorInfo) => {
    console.error('Unhandled error:', error, errorInfo);
    
    // 可以添加错误上报逻辑
    // reportError(error, errorInfo);
  };

  return { handleError };
};

// 高阶组件
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// 预设组件
export const MinimalErrorBoundary = (props) => (
  <ErrorBoundary
    {...props}
    className="flex items-center justify-center p-8 bg-gray-900 text-gray-100"
    title="出现错误"
    message="组件渲染失败，请稍后再试。"
    showDetails={false}
    showReload={false}
    showCopy={false}
  />
);

export const FullErrorBoundary = (props) => (
  <ErrorBoundary
    {...props}
    showDetails={true}
    showReload={true}
    showReset={true}
    showCopy={true}
  />
);

export const DevelopmentErrorBoundary = (props) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <ErrorBoundary
      {...props}
      showDetails={isDevelopment}
      showCopy={isDevelopment}
      showReset={true}
      showReload={true}
    />
  );
};

export default ErrorBoundary;
