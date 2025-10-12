import React, { forwardRef, useState, useEffect } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from '../primitives/Icon';
import Badge from '../primitives/Badge';
import Button from '../primitives/Button';
import Progress from '../primitives/Progress';
import Tooltip from '../primitives/Tooltip';

/**
 * TestConnection组件 - 连接测试组件
 */
const testConnectionVariants = createVariants(
  '',
  {
    variant: {
      default: '',
      inline: '',
      detailed: '',
      compact: ''
    },
    size: {
      sm: '',
      md: '',
      lg: ''
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const TestConnection = forwardRef(({
  connection,
  onTest,
  autoTest = false,
  showDetails = false,
  variant = 'default',
  size = 'md',
  className,
  ...props
}, ref) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [testHistory, setTestHistory] = useState([]);

  // 测试步骤
  const testSteps = [
    { key: 'validation', name: '验证配置', duration: 500 },
    { key: 'dns', name: 'DNS解析', duration: 2000 },
    { key: 'connect', name: '建立连接', duration: 3000 },
    { key: 'auth', name: '身份验证', duration: 2000 },
    { key: 'session', name: '会话测试', duration: 1000 }
  ];

  // 执行连接测试
  const performTest = async () => {
    if (!connection) return;

    setTesting(true);
    setResult(null);
    setProgress(0);
    setCurrentStep('');

    const testResult = {
      connectionId: connection.id,
      connectionName: connection.name,
      startTime: new Date(),
      endTime: null,
      success: false,
      steps: [],
      error: null,
      details: {}
    };

    try {
      for (let i = 0; i < testSteps.length; i++) {
        const step = testSteps[i];
        setCurrentStep(step.name);
        setProgress((i / testSteps.length) * 100);

        const stepResult = await executeTestStep(step, connection);
        testResult.steps.push({
          ...step,
          ...stepResult,
          timestamp: new Date()
        });

        if (!stepResult.success) {
          throw new Error(stepResult.error || `${step.name}失败`);
        }
      }

      testResult.success = true;
      testResult.endTime = new Date();
      testResult.duration = testResult.endTime - testResult.startTime;

    } catch (error) {
      testResult.success = false;
      testResult.error = error.message;
      testResult.endTime = new Date();
      testResult.duration = testResult.endTime - testResult.startTime;
    }

    setResult(testResult);
    setTestHistory(prev => [testResult, ...prev.slice(0, 9)]); // 保留最近10次
    setTesting(false);
    setProgress(100);
    setCurrentStep('');

    onTest?.(testResult);
  };

  // 模拟执行测试步骤
  const executeTestStep = async (step, connection) => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, step.duration));

    switch (step.key) {
      case 'validation':
        return validateConnection(connection);
      case 'dns':
        return await testDNSResolution(connection);
      case 'connect':
        return await testConnection(connection);
      case 'auth':
        return await testAuthentication(connection);
      case 'session':
        return await testSession(connection);
      default:
        return { success: true, message: '步骤完成' };
    }
  };

  // 验证连接配置
  const validateConnection = (connection) => {
    const errors = [];

    if (!connection.host) {
      errors.push('主机地址不能为空');
    }

    if (!connection.port || connection.port < 1 || connection.port > 65535) {
      errors.push('端口号无效');
    }

    if (!connection.username) {
      errors.push('用户名不能为空');
    }

    if (connection.authType === 'password' && !connection.password) {
      errors.push('密码不能为空');
    }

    if (connection.authType === 'privateKey' && !connection.privateKey && !connection.privateKeyPath) {
      errors.push('私钥不能为空');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join(', '),
        details: { errors }
      };
    }

    return {
      success: true,
      message: '配置验证通过'
    };
  };

  // 测试DNS解析
  const testDNSResolution = async (connection) => {
    // 模拟DNS解析测试
    const host = connection.host;
    
    // 检查是否为IP地址
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipRegex.test(host)) {
      return {
        success: true,
        message: '直接使用IP地址',
        details: { host, isIP: true }
      };
    }

    // 模拟DNS解析（实际应用中应该调用真实的DNS解析）
    const mockDNSResult = {
      success: Math.random() > 0.1, // 90%成功率
      ip: '192.168.1.100',
      ttl: 300
    };

    if (mockDNSResult.success) {
      return {
        success: true,
        message: `DNS解析成功: ${host} -> ${mockDNSResult.ip}`,
        details: mockDNSResult
      };
    } else {
      return {
        success: false,
        error: 'DNS解析失败',
        details: { host, error: 'Host not found' }
      };
    }
  };

  // 测试连接
  const testConnection = async (connection) => {
    // 模拟连接测试
    const mockConnectResult = {
      success: Math.random() > 0.2, // 80%成功率
      latency: Math.floor(Math.random() * 500) + 50, // 50-550ms
      serverInfo: {
        version: 'OpenSSH_8.9p1 Ubuntu-3ubuntu0.1',
        fingerprint: 'SHA256:abc123...'
      }
    };

    if (mockConnectResult.success) {
      return {
        success: true,
        message: `连接成功 (延迟: ${mockConnectResult.latency}ms)`,
        details: mockConnectResult
      };
    } else {
      return {
        success: false,
        error: '连接超时或被拒绝',
        details: { 
          timeout: connection.timeout || 30,
          error: 'Connection refused'
        }
      };
    }
  };

  // 测试身份验证
  const testAuthentication = async (connection) => {
    // 模拟身份验证测试
    const mockAuthResult = {
      success: Math.random() > 0.15, // 85%成功率
      method: connection.authType,
      authTime: Math.floor(Math.random() * 2000) + 500 // 500-2500ms
    };

    if (mockAuthResult.success) {
      return {
        success: true,
        message: `${connection.authType}认证成功`,
        details: mockAuthResult
      };
    } else {
      const errorMessages = {
        password: '密码错误',
        privateKey: '私钥验证失败',
        keyboard: '键盘交互认证失败'
      };
      
      return {
        success: false,
        error: errorMessages[connection.authType] || '认证失败',
        details: { method: connection.authType }
      };
    }
  };

  // 测试会话
  const testSession = async (connection) => {
    // 模拟会话测试
    const mockSessionResult = {
      success: Math.random() > 0.05, // 95%成功率
      commands: ['pwd', 'whoami', 'uname'],
      results: {
        pwd: '/home/user',
        whoami: connection.username,
        uname: 'Linux'
      }
    };

    if (mockSessionResult.success) {
      return {
        success: true,
        message: '会话测试成功',
        details: mockSessionResult
      };
    } else {
      return {
        success: false,
        error: '会话建立失败',
        details: { error: 'Session initialization failed' }
      };
    }
  };

  // 格式化持续时间
  const formatDuration = (ms) => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      return `${(ms / 60000).toFixed(1)}min`;
    }
  };

  // 获取状态颜色
  const getStatusColor = (success) => {
    return success ? 'text-green-500' : 'text-red-500';
  };

  // 获取进度条颜色
  const getProgressColor = () => {
    if (result) {
      return result.success ? 'success' : 'error';
    }
    return 'primary';
  };

  // 渲染紧凑模式
  if (variant === 'compact') {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2', className)}
        {...props}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={performTest}
          loading={testing}
          disabled={!connection}
        >
          <Icon name="Wifi" size={14} />
          测试
        </Button>

        {result && (
          <Badge
            variant={result.success ? 'success' : 'error'}
            size="xs"
          >
            {result.success ? '成功' : '失败'}
          </Badge>
        )}

        {testing && (
          <span className="text-xs text-gray-500">
            {currentStep}
          </span>
        )}
      </div>
    );
  }

  // 渲染内联模式
  if (variant === 'inline') {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-3 p-3 bg-gray-800 rounded-lg', className)}
        {...props}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={performTest}
          loading={testing}
          disabled={!connection}
        >
          <Icon name="Wifi" size={14} />
          {testing ? '测试中...' : '测试连接'}
        </Button>

        {(testing || result) && (
          <div className="flex-1 min-w-0">
            {testing && (
              <div className="flex items-center gap-2">
                <Progress
                  value={progress}
                  size="sm"
                  variant={getProgressColor()}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500 min-w-16">
                  {currentStep}
                </span>
              </div>
            )}

            {result && (
              <div className="flex items-center gap-2">
                <Icon
                  name={result.success ? 'CheckCircle' : 'AlertCircle'}
                  size={16}
                  className={getStatusColor(result.success)}
                />
                <span className={cn(
                  'text-sm',
                  getStatusColor(result.success)
                )}>
                  {result.success 
                    ? `连接成功 (${formatDuration(result.duration)})`
                    : result.error
                  }
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 渲染默认模式
  return (
    <div
      ref={ref}
      className={cn('bg-gray-900 border border-gray-800 rounded-lg p-6', className)}
      {...props}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Icon name="Wifi" size={20} className="text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-100">
              连接测试
            </h3>
            {connection && (
              <p className="text-sm text-gray-500">
                {connection.username}@{connection.host}:{connection.port}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="solid"
          onClick={performTest}
          loading={testing}
          disabled={!connection}
        >
          <Icon name="Play" size={14} />
          {testing ? '测试中...' : '开始测试'}
        </Button>
      </div>

      {/* 进度显示 */}
      {testing && (
        <div className="space-y-4 mb-6">
          <Progress
            value={progress}
            size="md"
            variant={getProgressColor()}
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              正在执行: {currentStep}
            </span>
            <span className="text-gray-500">
              {Math.round(progress)}%
            </span>
          </div>

          {/* 步骤详情 */}
          <div className="space-y-2">
            {testSteps.map((step, index) => {
              const isCompleted = (index / testSteps.length) * 100 <= progress;
              const isCurrent = currentStep === step.name;
              
              return (
                <div
                  key={step.key}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded',
                    isCompleted && 'bg-green-900/20',
                    isCurrent && 'bg-blue-900/20'
                  )}
                >
                  <Icon
                    name={
                      isCompleted ? 'CheckCircle' :
                      isCurrent ? 'Loader2' : 'Circle'
                    }
                    size={14}
                    className={cn(
                      isCompleted && 'text-green-500',
                      isCurrent && 'text-blue-500 animate-spin',
                      !isCompleted && !isCurrent && 'text-gray-600'
                    )}
                  />
                  <span className={cn(
                    'text-sm',
                    isCompleted && 'text-green-400',
                    isCurrent && 'text-blue-400',
                    !isCompleted && !isCurrent && 'text-gray-500'
                  )}>
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 测试结果 */}
      {result && (
        <div className={cn(
          'p-4 rounded-lg border mb-6',
          result.success 
            ? 'bg-green-900/20 border-green-800/50'
            : 'bg-red-900/20 border-red-800/50'
        )}>
          <div className="flex items-center gap-3 mb-3">
            <Icon
              name={result.success ? 'CheckCircle' : 'AlertCircle'}
              size={20}
              className={getStatusColor(result.success)}
            />
            <div className="flex-1">
              <h4 className={cn(
                'font-medium',
                getStatusColor(result.success)
              )}>
                {result.success ? '连接测试成功' : '连接测试失败'}
              </h4>
              <p className="text-sm text-gray-400">
                耗时: {formatDuration(result.duration)}
              </p>
            </div>
            
            <Badge
              variant={result.success ? 'success' : 'error'}
              size="sm"
            >
              {result.success ? '成功' : '失败'}
            </Badge>
          </div>

          {!result.success && result.error && (
            <p className="text-sm text-red-400 mb-3">
              错误: {result.error}
            </p>
          )}

          {/* 步骤结果 */}
          {(showDetails || variant === 'detailed') && result.steps.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-300">测试步骤:</h5>
              {result.steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 bg-gray-800/50 rounded"
                >
                  <Icon
                    name={step.success ? 'CheckCircle' : 'AlertCircle'}
                    size={14}
                    className={cn(
                      'mt-0.5',
                      step.success ? 'text-green-500' : 'text-red-500'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-300">
                        {step.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {step.timestamp && new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {step.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 测试历史 */}
      {variant === 'detailed' && testHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            测试历史
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {testHistory.map((history, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={history.success ? 'CheckCircle' : 'AlertCircle'}
                    size={12}
                    className={getStatusColor(history.success)}
                  />
                  <span className="text-xs text-gray-400">
                    {new Date(history.startTime).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatDuration(history.duration)}
                  </span>
                  <Badge
                    variant={history.success ? 'success' : 'error'}
                    size="xs"
                  >
                    {history.success ? '成功' : '失败'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

TestConnection.displayName = 'TestConnection';

export default TestConnection;

/**
 * InlineTestConnection组件 - 内联连接测试组件
 */
export const InlineTestConnection = forwardRef((props, ref) => {
  return (
    <TestConnection
      ref={ref}
      variant="inline"
      {...props}
    />
  );
});

InlineTestConnection.displayName = 'InlineTestConnection';

/**
 * CompactTestConnection组件 - 紧凑型连接测试组件
 */
export const CompactTestConnection = forwardRef((props, ref) => {
  return (
    <TestConnection
      ref={ref}
      variant="compact"
      {...props}
    />
  );
});

CompactTestConnection.displayName = 'CompactTestConnection';
