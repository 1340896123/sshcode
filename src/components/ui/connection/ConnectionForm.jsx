import React, { forwardRef, useState, useEffect } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from '../primitives/Icon';
import Badge from '../primitives/Badge';
import Button from '../primitives/Button';
import Input from '../primitives/Input';
import Textarea from '../primitives/Textarea';
import Select from '../primitives/Select';
import Switch from '../primitives/Switch';
import Tooltip from '../primitives/Tooltip';
import Modal from '../feedback/Modal';

/**
 * ConnectionForm组件 - 连接表单
 */
const connectionFormVariants = createVariants(
  'bg-gray-900 rounded-lg',
  {
    variant: {
      default: 'bg-gray-900',
      modal: 'bg-gray-900',
      embedded: 'bg-gray-900'
    },
    size: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const ConnectionForm = forwardRef(({
  connection = null,
  mode = 'create', // create | edit | duplicate
  onSave,
  onCancel,
  onTest,
  loading = false,
  testing = false,
  testResult = null,
  showAdvanced = false,
  variant,
  size,
  className,
  ...props
}, ref) => {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKey: '',
    privateKeyPath: '',
    passphrase: '',
    authType: 'password',
    group: '',
    description: '',
    tags: [],
    timeout: 30,
    keepAlive: true,
    keepAliveInterval: 60,
    compression: false,
    proxyEnabled: false,
    proxyType: 'http',
    proxyHost: '',
    proxyPort: 8080,
    proxyUsername: '',
    proxyPassword: '',
    ...connection
  });

  const [errors, setErrors] = useState({});
  const [showAdvancedForm, setShowAdvancedForm] = useState(showAdvanced);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (connection) {
      setFormData({
        ...formData,
        ...connection,
        tags: connection.tags || []
      });
    }
  }, [connection]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleTagAdd = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleTagRemove = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTagAdd();
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '连接名称不能为空';
    }

    if (!formData.host.trim()) {
      newErrors.host = '主机地址不能为空';
    }

    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = '端口号必须在1-65535之间';
    }

    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空';
    }

    if (formData.authType === 'password' && !formData.password.trim()) {
      newErrors.password = '密码不能为空';
    }

    if (formData.authType === 'privateKey' && !formData.privateKey && !formData.privateKeyPath) {
      newErrors.privateKey = '请输入私钥内容或选择私钥文件';
    }

    if (formData.proxyEnabled && !formData.proxyHost.trim()) {
      newErrors.proxyHost = '代理主机地址不能为空';
    }

    if (formData.proxyEnabled && (!formData.proxyPort || formData.proxyPort < 1 || formData.proxyPort > 65535)) {
      newErrors.proxyPort = '代理端口号必须在1-65535之间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const submitData = {
        ...formData,
        id: connection?.id || Date.now().toString(),
        createdAt: connection?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: connection?.status || 'disconnected'
      };

      // 编辑模式下不包含密码字段（如果未修改）
      if (mode === 'edit' && !formData.password) {
        delete submitData.password;
      }

      onSave?.(submitData);
    }
  };

  const handleTest = () => {
    if (validateForm()) {
      onTest?.(formData);
    }
  };

  const handleFileSelect = (field) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = field === 'privateKey' ? '.pem,.key' : '*/*';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (field === 'privateKey') {
            handleInputChange('privateKey', e.target.result);
          } else {
            handleInputChange(field, file.path);
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  };

  const isEdit = mode === 'edit';
  const isDuplicate = mode === 'duplicate';
  const title = isEdit ? '编辑连接' : isDuplicate ? '复制连接' : '新建连接';

  return (
    <div
      ref={ref}
      className={cn(connectionFormVariants({ variant, size }), className)}
      {...props}
    >
      {/* 表单头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
        <div className="flex items-center gap-2">
          {testResult && (
            <Badge
              variant={testResult.success ? 'success' : 'error'}
              size="sm"
            >
              {testResult.success ? '连接成功' : '连接失败'}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            loading={testing}
            disabled={loading}
          >
            <Icon name="Wifi" size={14} />
            测试连接
          </Button>
        </div>
      </div>

      {/* 表单内容 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基础信息 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Icon name="Server" size={16} />
            基础信息
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                连接名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(value) => handleInputChange('name', value)}
                placeholder="例如：生产服务器"
                error={errors.name}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                分组
              </label>
              <Input
                value={formData.group}
                onChange={(value) => handleInputChange('group', value)}
                placeholder="例如：生产环境"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              描述
            </label>
            <Textarea
              value={formData.description}
              onChange={(value) => handleInputChange('description', value)}
              placeholder="连接描述信息..."
              rows={2}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              标签
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={setTagInput}
                  onKeyPress={handleTagInputKeyPress}
                  placeholder="添加标签..."
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTagAdd}
                  disabled={loading || !tagInput.trim()}
                >
                  <Icon name="Plus" size={14} />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => handleTagRemove(tag)}
                    >
                      {tag}
                      <Icon name="X" size={12} className="ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 连接信息 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Icon name="Wifi" size={16} />
            连接信息
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                主机地址 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.host}
                onChange={(value) => handleInputChange('host', value)}
                placeholder="例如：192.168.1.100"
                error={errors.host}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                端口 <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.port}
                onChange={(value) => handleInputChange('port', parseInt(value) || 22)}
                placeholder="22"
                error={errors.port}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                用户名 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.username}
                onChange={(value) => handleInputChange('username', value)}
                placeholder="例如：root"
                error={errors.username}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* 认证信息 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Icon name="Lock" size={16} />
            认证信息
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              认证方式
            </label>
            <Select
              value={formData.authType}
              onChange={(value) => handleInputChange('authType', value)}
              disabled={loading}
            >
              <option value="password">密码认证</option>
              <option value="privateKey">私钥认证</option>
              <option value="keyboard">键盘交互</option>
            </Select>
          </div>

          {formData.authType === 'password' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                密码 <span className="text-red-500">*</span>
                {isEdit && <span className="text-xs text-gray-500 ml-2">留空保持不变</span>}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(value) => handleInputChange('password', value)}
                placeholder="输入密码"
                error={errors.password}
                disabled={loading}
              />
            </div>
          )}

          {formData.authType === 'privateKey' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  私钥内容
                </label>
                <Textarea
                  value={formData.privateKey}
                  onChange={(value) => handleInputChange('privateKey', value)}
                  placeholder="粘贴私钥内容..."
                  rows={6}
                  error={errors.privateKey}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileSelect('privateKey')}
                  disabled={loading}
                >
                  <Icon name="Upload" size={14} />
                  选择私钥文件
                </Button>
                <span className="text-xs text-gray-500">支持 .pem, .key 格式</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  私钥密码
                </label>
                <Input
                  type="password"
                  value={formData.passphrase}
                  onChange={(value) => handleInputChange('passphrase', value)}
                  placeholder="私钥密码（可选）"
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>

        {/* 高级设置 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Icon name="Settings" size={16} />
              高级设置
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedForm(!showAdvancedForm)}
            >
              <Icon 
                name={showAdvancedForm ? 'ChevronUp' : 'ChevronDown'} 
                size={14} 
              />
              {showAdvancedForm ? '收起' : '展开'}
            </Button>
          </div>

          {showAdvancedForm && (
            <div className="space-y-4 pl-6 border-l-2 border-gray-800">
              {/* 连接设置 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    连接超时（秒）
                  </label>
                  <Input
                    type="number"
                    value={formData.timeout}
                    onChange={(value) => handleInputChange('timeout', parseInt(value) || 30)}
                    placeholder="30"
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={formData.keepAlive}
                    onChange={(checked) => handleInputChange('keepAlive', checked)}
                    disabled={loading}
                  />
                  <label className="text-sm text-gray-300">保持连接</label>
                </div>
              </div>

              {formData.keepAlive && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    心跳间隔（秒）
                  </label>
                  <Input
                    type="number"
                    value={formData.keepAliveInterval}
                    onChange={(value) => handleInputChange('keepAliveInterval', parseInt(value) || 60)}
                    placeholder="60"
                    disabled={loading}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.compression}
                  onChange={(checked) => handleInputChange('compression', checked)}
                  disabled={loading}
                />
                <label className="text-sm text-gray-300">启用压缩</label>
              </div>

              {/* 代理设置 */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.proxyEnabled}
                    onChange={(checked) => handleInputChange('proxyEnabled', checked)}
                    disabled={loading}
                  />
                  <label className="text-sm text-gray-300">使用代理</label>
                </div>

                {formData.proxyEnabled && (
                  <div className="space-y-4 pl-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          代理类型
                        </label>
                        <Select
                          value={formData.proxyType}
                          onChange={(value) => handleInputChange('proxyType', value)}
                          disabled={loading}
                        >
                          <option value="http">HTTP</option>
                          <option value="socks4">SOCKS4</option>
                          <option value="socks5">SOCKS5</option>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          代理主机 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={formData.proxyHost}
                          onChange={(value) => handleInputChange('proxyHost', value)}
                          placeholder="例如：127.0.0.1"
                          error={errors.proxyHost}
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          代理端口 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={formData.proxyPort}
                          onChange={(value) => handleInputChange('proxyPort', parseInt(value) || 8080)}
                          placeholder="8080"
                          error={errors.proxyPort}
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          代理用户名
                        </label>
                        <Input
                          value={formData.proxyUsername}
                          onChange={(value) => handleInputChange('proxyUsername', value)}
                          placeholder="代理用户名（可选）"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        代理密码
                      </label>
                      <Input
                        type="password"
                        value={formData.proxyPassword}
                        onChange={(value) => handleInputChange('proxyPassword', value)}
                        placeholder="代理密码（可选）"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 测试结果 */}
        {testResult && (
          <div className={cn(
            'p-4 rounded-lg border',
            testResult.success 
              ? 'bg-green-900/20 border-green-800/50 text-green-400'
              : 'bg-red-900/20 border-red-800/50 text-red-400'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Icon name={testResult.success ? 'CheckCircle' : 'AlertCircle'} size={16} />
              <span className="font-medium">
                {testResult.success ? '连接测试成功' : '连接测试失败'}
              </span>
            </div>
            {testResult.message && (
              <p className="text-sm">{testResult.message}</p>
            )}
            {testResult.details && (
              <pre className="text-xs mt-2 whitespace-pre-wrap">
                {testResult.details}
              </pre>
            )}
          </div>
        )}

        {/* 表单操作 */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-800">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading || testing}
          >
            取消
          </Button>
          <Button
            type="submit"
            variant="solid"
            loading={loading}
            disabled={testing}
          >
            <Icon name="Save" size={14} />
            {isEdit ? '保存修改' : '创建连接'}
          </Button>
        </div>
      </form>
    </div>
  );
});

ConnectionForm.displayName = 'ConnectionForm';

export default ConnectionForm;

/**
 * ConnectionFormModal组件 - 连接表单模态框
 */
export const ConnectionFormModal = forwardRef(({
  isOpen,
  onClose,
  ...props
}, ref) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title=""
    >
      <ConnectionForm
        ref={ref}
        variant="modal"
        onCancel={onClose}
        {...props}
      />
    </Modal>
  );
});

ConnectionFormModal.displayName = 'ConnectionFormModal';
