import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';

/**
 * GuardrailNotice组件 - 权限提示与沙盒组件
 */
export function GuardrailNotice({
  type = 'warning', // warning|error|info
  title = '安全提示',
  message = '',
  actions = [],
  onConfirm,
  onCancel,
  showCheckbox = false,
  checkboxLabel = '不再提示',
  className = '',
  ...props
}) {
  const [checked, setChecked] = useState(false);

  const getTypeStyles = () => {
    const styles = {
      warning: {
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-700',
        iconColor: 'warning',
        icon: 'AlertTriangle'
      },
      error: {
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-700',
        iconColor: 'error',
        icon: 'XCircle'
      },
      info: {
        bgColor: 'bg-blue-900/20',
        borderColor: 'border-blue-700',
        iconColor: 'primary',
        icon: 'Info'
      }
    };
    return styles[type] || styles.warning;
  };

  const styles = getTypeStyles();

  return (
    <div className={clsx(
      `${styles.bgColor} ${styles.borderColor} border rounded-lg p-4`,
      className
    )} {...props}>
      <div className="flex items-start gap-3">
        <Icon name={styles.icon} size="md" color={styles.iconColor} />
        
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-100 mb-1">{title}</h4>
          <p className="text-sm text-gray-300 mb-3">{message}</p>
          
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  size="xs"
                  variant={action.primary ? 'solid' : 'outline'}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
          
          {showCheckbox && (
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
              />
              {checkboxLabel}
            </label>
          )}
          
          {(onConfirm || onCancel) && (
            <div className="flex justify-end gap-2 mt-3">
              {onCancel && (
                <Button size="sm" variant="outline" onClick={onCancel}>
                  取消
                </Button>
              )}
              {onConfirm && (
                <Button size="sm" onClick={() => onConfirm(checked)}>
                  确认
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 预设组件
export const DangerousCommandWarning = (props) => (
  <GuardrailNotice
    type="warning"
    title="危险命令警告"
    message="即将执行的命令可能对系统造成严重影响，请仔细确认。"
    showCheckbox
    checkboxLabel="我知道风险，继续执行"
    {...props}
  />
);

export const ReadOnlyModeNotice = (props) => (
  <GuardrailNotice
    type="info"
    title="只读模式"
    message="当前处于只读模式，无法执行修改操作。如需编辑，请切换到可写模式。"
    {...props}
  />
);

export const HighRiskOperation = (props) => (
  <GuardrailNotice
    type="error"
    title="高风险操作"
    message="此操作可能导致数据丢失或系统损坏，需要二次确认。"
    showCheckbox
    checkboxLabel="我已备份重要数据，继续操作"
    {...props}
  />
);

export default GuardrailNotice;
