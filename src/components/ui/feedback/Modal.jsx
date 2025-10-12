import React, { useEffect, useRef } from 'react';
import Button from '../primitives/Button';

/**
 * 模态框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否打开模态框
 * @param {function} props.onClose - 关闭模态框回调函数
 * @param {string} props.title - 模态框标题
 * @param {React.ReactNode} props.children - 模态框内容
 * @param {string} props.size - 模态框大小: 'small' | 'medium' | 'large' | 'fullscreen'
 * @param {boolean} props.closeOnOverlayClick - 点击遮罩是否关闭
 * @param {boolean} props.closeOnEscape - 按ESC键是否关闭
 * @param {boolean} props.showCloseButton - 是否显示关闭按钮
 * @param {React.ReactNode} props.footer - 底部内容
 * @param {string} props.className - 额外的CSS类名
 * @param {string} props.overlayClassName - 遮罩层额外CSS类名
 */
function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  footer,
  className = '',
  overlayClassName = ''
}) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // 保存当前焦点元素
      previousFocusRef.current = document.activeElement;
      
      // 禁用背景滚动
      document.body.style.overflow = 'hidden';
      
      // 设置焦点到模态框
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      // 恢复背景滚动
      document.body.style.overflow = '';
      
      // 恢复焦点
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && closeOnEscape && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape, onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'modal-small';
      case 'medium':
        return 'modal-medium';
      case 'large':
        return 'modal-large';
      case 'fullscreen':
        return 'modal-fullscreen';
      default:
        return 'modal-medium';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] ${overlayClassName}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`modal-content ${getSizeClasses()} ${className}`}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 模态框头部 */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-[#cccccc]">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="small"
                size="small"
                onClick={onClose}
                className="modal-close"
                title="关闭"
              >
                ×
              </Button>
            )}
          </div>
        )}

        {/* 模态框内容 */}
        <div className="modal-body">
          {children}
        </div>

        {/* 模态框底部 */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 确认对话框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否打开对话框
 * @param {function} props.onClose - 关闭对话框回调函数
 * @param {function} props.onConfirm - 确认回调函数
 * @param {string} props.title - 对话框标题
 * @param {string} props.message - 确认消息
 * @param {string} props.confirmText - 确认按钮文本
 * @param {string} props.cancelText - 取消按钮文本
 * @param {string} props.type - 对话框类型: 'info' | 'warning' | 'error' | 'success'
 * @param {string} props.className - 额外的CSS类名
 */
function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '确认',
  message = '确定要执行此操作吗？',
  confirmText = '确定',
  cancelText = '取消',
  type = 'info',
  className = ''
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button
        variant="secondary"
        onClick={onClose}
      >
        {cancelText}
      </Button>
      <Button
        variant={type === 'error' ? 'delete' : 'primary'}
        onClick={handleConfirm}
      >
        {confirmText}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      footer={footer}
      className={className}
    >
      <div className="flex items-center gap-3 text-[#d4d4d4]">
        <span className="text-2xl">{getIcon()}</span>
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}

/**
 * 警告对话框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否打开对话框
 * @param {function} props.onClose - 关闭对话框回调函数
 * @param {string} props.title - 对话框标题
 * @param {string} props.message - 警告消息
 * @param {string} props.buttonText - 按钮文本
 */
function AlertDialog({
  isOpen,
  onClose,
  title = '提示',
  message = '',
  buttonText = '确定'
}) {
  const footer = (
    <div className="flex justify-end">
      <Button onClick={onClose}>
        {buttonText}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      footer={footer}
    >
      <p className="text-[#d4d4d4] text-sm leading-relaxed">{message}</p>
    </Modal>
  );
}

// 命名导出和默认导出
export { Modal, ConfirmDialog, AlertDialog };
export default Modal;
