import React, { forwardRef, useState } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Modal } from '../feedback/Modal';
import { Input } from '../primitives/Input';
import { Select } from '../primitives/Select';
import { Checkbox } from '../primitives/Switch';
import { Badge } from '../primitives/Badge';
import { Separator } from '../primitives/Separator';

const wizardVariants = cva(
  'bg-slate-900 border border-slate-700 rounded-lg shadow-xl',
  {
    variants: {
      size: {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const stepVariants = cva(
  'transition-all duration-300',
  {
    variants: {
      active: {
        true: 'opacity-100 translate-x-0',
        false: 'opacity-0 translate-x-full absolute inset-0',
      },
    },
    defaultVariants: {
      active: true,
    },
  }
);

export const NewSessionWizard = forwardRef((
  {
    className,
    size,
    open,
    onClose,
    onComplete,
    connections = [],
    recentSessions = [],
    ...props
  },
  ref
) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [customSettings, setCustomSettings] = useState({
    autoConnect: true,
    saveHistory: true,
    enableAI: false,
    startWithTerminal: true,
  });

  const steps = [
    {
      id: 'connection',
      title: '选择连接',
      description: '选择要连接的服务器或创建新连接',
    },
    {
      id: 'sessions',
      title: '会话配置',
      description: '配置会话选项和批量操作',
    },
    {
      id: 'confirm',
      title: '确认创建',
      description: '确认会话配置并创建',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    const sessionData = {
      connection: selectedConnection,
      sessions: selectedSessions,
      name: sessionName,
      settings: customSettings,
    };
    
    onComplete?.(sessionData);
    handleClose();
  };

  const handleClose = () => {
    setCurrentStep(0);
    setSelectedConnection(null);
    setSelectedSessions([]);
    setSessionName('');
    setCustomSettings({
      autoConnect: true,
      saveHistory: true,
      enableAI: false,
      startWithTerminal: true,
    });
    onClose?.();
  };

  const renderConnectionStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          选择连接服务器
        </h3>
        <p className="text-sm text-slate-400">
          选择已有连接或创建新连接
        </p>
      </div>

      {/* 连接列表 */}
      <div className="space-y-3">
        {connections.map((connection) => (
          <div
            key={connection.id}
            className={clsx(
              'p-4 border rounded-lg cursor-pointer transition-colors',
              selectedConnection?.id === connection.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
            )}
            onClick={() => setSelectedConnection(connection)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={clsx(
                  'w-2 h-2 rounded-full',
                  connection.status === 'online' ? 'bg-green-500' : 'bg-slate-500'
                )} />
                <div>
                  <div className="font-medium text-white">
                    {connection.name}
                  </div>
                  <div className="text-sm text-slate-400">
                    {connection.user}@{connection.host}:{connection.port}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {connection.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 新建连接按钮 */}
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => {/* 跳转到新建连接 */}}
      >
        <Icon name="Plus" className="w-4 h-4 mr-2" />
        新建连接
      </Button>
    </div>
  );

  const renderSessionsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          会话配置
        </h3>
        <p className="text-sm text-slate-400">
          配置会话名称和启动选项
        </p>
      </div>

      {/* 会话名称 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          会话名称
        </label>
        <Input
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder={selectedConnection?.name || '新会话'}
          className="w-full"
        />
      </div>

      {/* 会话设置 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-slate-300">启动选项</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-400">自动连接</label>
            <Checkbox
              checked={customSettings.autoConnect}
              onCheckedChange={(checked) => 
                setCustomSettings(prev => ({ ...prev, autoConnect: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-400">保存历史记录</label>
            <Checkbox
              checked={customSettings.saveHistory}
              onCheckedChange={(checked) => 
                setCustomSettings(prev => ({ ...prev, saveHistory: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-400">启用 AI 助手</label>
            <Checkbox
              checked={customSettings.enableAI}
              onCheckedChange={(checked) => 
                setCustomSettings(prev => ({ ...prev, enableAI: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-400">启动终端</label>
            <Checkbox
              checked={customSettings.startWithTerminal}
              onCheckedChange={(checked) => 
                setCustomSettings(prev => ({ ...prev, startWithTerminal: checked }))
              }
            />
          </div>
        </div>
      </div>

      {/* 最近会话模板 */}
      {recentSessions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">
            使用最近会话模板
          </h4>
          <div className="space-y-2">
            {recentSessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="p-3 border border-slate-700 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                onClick={() => setSessionName(session.name)}
              >
                <div className="text-sm text-white">{session.name}</div>
                <div className="text-xs text-slate-500">
                  {session.createdAt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          确认会话配置
        </h3>
        <p className="text-sm text-slate-400">
          检查会话配置并点击创建
        </p>
      </div>

      {/* 配置摘要 */}
      <div className="space-y-4">
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-300 mb-3">会话信息</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">会话名称:</span>
              <span className="text-white">{sessionName || '未命名会话'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">连接服务器:</span>
              <span className="text-white">
                {selectedConnection?.user}@{selectedConnection?.host}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">端口:</span>
              <span className="text-white">{selectedConnection?.port}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-300 mb-3">启动选项</h4>
          <div className="space-y-2 text-sm">
            {customSettings.autoConnect && (
              <div className="flex items-center space-x-2">
                <Icon name="Check" className="w-4 h-4 text-green-500" />
                <span className="text-slate-300">自动连接</span>
              </div>
            )}
            {customSettings.saveHistory && (
              <div className="flex items-center space-x-2">
                <Icon name="Check" className="w-4 h-4 text-green-500" />
                <span className="text-slate-300">保存历史记录</span>
              </div>
            )}
            {customSettings.enableAI && (
              <div className="flex items-center space-x-2">
                <Icon name="Check" className="w-4 h-4 text-green-500" />
                <span className="text-slate-300">启用 AI 助手</span>
              </div>
            )}
            {customSettings.startWithTerminal && (
              <div className="flex items-center space-x-2">
                <Icon name="Check" className="w-4 h-4 text-green-500" />
                <span className="text-slate-300">启动终端</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    const steps = {
      0: renderConnectionStep,
      1: renderSessionsStep,
      2: renderConfirmStep,
    };

    return steps[currentStep]?.();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedConnection !== null;
      case 1:
        return sessionName.trim().length > 0;
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <Modal
      ref={ref}
      open={open}
      onClose={handleClose}
      size={size}
      className={clsx(wizardVariants({ size, className }))}
      {...props}
    >
      {/* 步骤指示器 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                index <= currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-400'
              )}>
                {index < currentStep ? (
                  <Icon name="Check" className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="ml-3">
                <div className={clsx(
                  'text-sm font-medium',
                  index <= currentStep ? 'text-white' : 'text-slate-400'
                )}>
                  {step.title}
                </div>
                <div className="text-xs text-slate-500">
                  {step.description}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={clsx(
                  'w-8 h-0.5 mx-4',
                  index < currentStep ? 'bg-blue-500' : 'bg-slate-700'
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="px-6 py-6 min-h-[400px] relative">
        {renderStep()}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
        <Button
          variant="ghost"
          onClick={handleClose}
        >
          取消
        </Button>

        <div className="flex items-center space-x-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
            >
              上一步
            </Button>
          )}

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {currentStep === steps.length - 1 ? '创建会话' : '下一步'}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

NewSessionWizard.displayName = 'NewSessionWizard';
