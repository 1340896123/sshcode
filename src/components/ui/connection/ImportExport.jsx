import React, { forwardRef, useState, useRef } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from '../primitives/Icon';
import Badge from '../primitives/Badge';
import Button from '../primitives/Button';
import Input from '../primitives/Input';
import Textarea from '../primitives/Textarea';
import Switch from '../primitives/Switch';
import Select from '../primitives/Select';
import Modal from '../feedback/Modal';
import Tooltip from '../primitives/Tooltip';

/**
 * ImportExport组件 - 导入导出连接配置
 */
const importExportVariants = createVariants(
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

const ImportExport = forwardRef(({
  connections = [],
  mode = 'export', // export | import
  onImport,
  onExport,
  loading = false,
  variant,
  size,
  className,
  ...props
}, ref) => {
  const [exportFormat, setExportFormat] = useState('json');
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [includePasswords, setIncludePasswords] = useState(false);
  const [importData, setImportData] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importOptions, setImportOptions] = useState({
    overwriteExisting: false,
    preserveIds: false,
    skipDuplicates: true
  });
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  // 导出功能
  const handleExport = () => {
    const dataToExport = selectedConnections.length > 0 
      ? connections.filter(conn => selectedConnections.includes(conn.id))
      : connections;

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: dataToExport.length,
      connections: dataToExport.map(conn => {
        const exported = { ...conn };
        if (!includePasswords) {
          delete exported.password;
          delete exported.privateKey;
          delete exported.passphrase;
        }
        return exported;
      })
    };

    onExport?.(exportData, exportFormat);
  };

  // 文件选择
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          setImportData(e.target.result);
          setPreviewData(data);
          setShowPreview(true);
        } catch (error) {
          console.error('Invalid JSON file:', error);
          // 处理错误
        }
      };
      reader.readAsText(file);
    }
  };

  // 拖拽上传
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setImportFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            setImportData(e.target.result);
            setPreviewData(data);
            setShowPreview(true);
          } catch (error) {
            console.error('Invalid JSON file:', error);
          }
        };
        reader.readAsText(file);
      }
    }
  };

  // 导入处理
  const handleImport = () => {
    if (!importData && !importFile) return;

    try {
      const data = importData ? JSON.parse(importData) : null;
      if (data && data.connections) {
        onImport?.(data, importOptions);
      }
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  // 切换连接选择
  const toggleConnectionSelection = (connectionId) => {
    setSelectedConnections(prev => 
      prev.includes(connectionId)
        ? prev.filter(id => id !== connectionId)
        : [...prev, connectionId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedConnections.length === connections.length) {
      setSelectedConnections([]);
    } else {
      setSelectedConnections(connections.map(conn => conn.id));
    }
  };

  // 下载文件
  const downloadFile = (data, filename, format) => {
    let content, mimeType;
    
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      filename = filename.endsWith('.json') ? filename : `${filename}.json`;
    } else if (format === 'csv') {
      // 简单的CSV格式
      const headers = ['name', 'host', 'port', 'username', 'group', 'authType'];
      const rows = data.connections.map(conn => 
        headers.map(header => conn[header] || '').join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      filename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isExportMode = mode === 'export';
  const title = isExportMode ? '导出连接配置' : '导入连接配置';

  return (
    <div
      ref={ref}
      className={cn(importExportVariants({ variant, size }), className)}
      {...props}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm">
            {connections.length} 个连接
          </Badge>
        </div>
      </div>

      {/* 导出模式 */}
      {isExportMode && (
        <div className="space-y-6">
          {/* 导出格式选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              导出格式
            </label>
            <div className="flex items-center gap-3">
              <Select
                value={exportFormat}
                onChange={setExportFormat}
                className="min-w-32"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </Select>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={includePasswords}
                  onChange={setIncludePasswords}
                />
                <label className="text-sm text-gray-300">包含敏感信息</label>
                <Tooltip content="包含密码和私钥等敏感信息，请谨慎处理">
                  <Icon name="AlertCircle" size={14} className="text-gray-500" />
                </Tooltip>
              </div>
            </div>
          </div>

          {/* 连接选择 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-300">
                选择要导出的连接
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedConnections.length === connections.length ? '取消全选' : '全选'}
              </Button>
            </div>

            <div className="border border-gray-800 rounded-lg max-h-64 overflow-y-auto">
              {connections.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  暂无连接可导出
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {connections.map(connection => (
                    <div
                      key={connection.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-800/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedConnections.includes(connection.id)}
                        onChange={() => toggleConnectionSelection(connection.id)}
                        className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-100 truncate">
                            {connection.name}
                          </span>
                          <Badge 
                            variant={connection.status === 'connected' ? 'success' : 'default'} 
                            size="xs"
                          >
                            {connection.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {connection.username}@{connection.host}:{connection.port}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 导出操作 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <Button
              variant="solid"
              onClick={() => {
                const dataToExport = selectedConnections.length > 0 
                  ? connections.filter(conn => selectedConnections.includes(conn.id))
                  : connections;

                const exportData = {
                  version: '1.0',
                  exportedAt: new Date().toISOString(),
                  count: dataToExport.length,
                  connections: dataToExport.map(conn => {
                    const exported = { ...conn };
                    if (!includePasswords) {
                      delete exported.password;
                      delete exported.privateKey;
                      delete exported.passphrase;
                    }
                    return exported;
                  })
                };

                const filename = `ssh-connections-${new Date().toISOString().split('T')[0]}`;
                downloadFile(exportData, filename, exportFormat);
              }}
              disabled={connections.length === 0 || loading}
            >
              <Icon name="Download" size={14} />
              下载文件
            </Button>
          </div>
        </div>
      )}

      {/* 导入模式 */}
      {!isExportMode && (
        <div className="space-y-6">
          {/* 文件上传区域 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              选择配置文件
            </label>
            
            <div
              className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-600 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="Upload" size={32} className="text-gray-500 mx-auto mb-3" />
              <p className="text-gray-300 mb-2">
                拖拽JSON文件到此处，或点击选择文件
              </p>
              <p className="text-sm text-gray-500">
                支持SSH客户端导出的连接配置文件
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {importFile && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                <Icon name="File" size={16} className="text-gray-400" />
                <span className="text-sm text-gray-300 flex-1 truncate">
                  {importFile.name}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setImportFile(null);
                    setImportData('');
                    setPreviewData(null);
                    setShowPreview(false);
                  }}
                >
                  <Icon name="X" size={14} />
                </Button>
              </div>
            )}
          </div>

          {/* 导入选项 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              导入选项
            </label>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={importOptions.overwriteExisting}
                  onChange={(checked) => setImportOptions(prev => ({
                    ...prev,
                    overwriteExisting: checked
                  }))}
                />
                <label className="text-sm text-gray-300">覆盖已存在的连接</label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={importOptions.preserveIds}
                  onChange={(checked) => setImportOptions(prev => ({
                    ...prev,
                    preserveIds: checked
                  }))}
                />
                <label className="text-sm text-gray-300">保留原始ID</label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={importOptions.skipDuplicates}
                  onChange={(checked) => setImportOptions(prev => ({
                    ...prev,
                    skipDuplicates: checked
                  }))}
                />
                <label className="text-sm text-gray-300">跳过重复连接</label>
              </div>
            </div>
          </div>

          {/* 预览区域 */}
          {showPreview && previewData && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  预览导入数据
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  <Icon name="X" size={14} />
                </Button>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-500">版本:</span>
                    <span className="text-gray-300 ml-2">{previewData.version}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">连接数量:</span>
                    <span className="text-gray-300 ml-2">{previewData.count}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">导出时间:</span>
                    <span className="text-gray-300 ml-2">
                      {new Date(previewData.exportedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {previewData.connections && previewData.connections.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">连接列表:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {previewData.connections.slice(0, 10).map((conn, index) => (
                        <div key={index} className="text-xs text-gray-400 flex items-center gap-2">
                          <span>{conn.name}</span>
                          <span className="text-gray-600">-</span>
                          <span>{conn.username}@{conn.host}:{conn.port}</span>
                        </div>
                      ))}
                      {previewData.connections.length > 10 && (
                        <div className="text-xs text-gray-500">
                          ... 还有 {previewData.connections.length - 10} 个连接
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 导入操作 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <Button
              variant="outline"
              onClick={() => {
                setImportFile(null);
                setImportData('');
                setPreviewData(null);
                setShowPreview(false);
              }}
            >
              清除
            </Button>
            <Button
              variant="solid"
              onClick={handleImport}
              loading={loading}
              disabled={!importData || !previewData}
            >
              <Icon name="Upload" size={14} />
              导入配置
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

ImportExport.displayName = 'ImportExport';

export default ImportExport;

/**
 * ImportExportModal组件 - 导入导出模态框
 */
export const ImportExportModal = forwardRef(({
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
      <ImportExport
        ref={ref}
        variant="modal"
        {...props}
      />
    </Modal>
  );
});

ImportExportModal.displayName = 'ImportExportModal';

/**
 * QuickExportButton组件 - 快速导出按钮
 */
export const QuickExportButton = forwardRef(({
  connections,
  onExport,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        {...props}
      >
        <Icon name="Download" size={14} />
        导出配置
      </Button>
      
      <ImportExportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mode="export"
        connections={connections}
        onExport={(data, format) => {
          onExport?.(data, format);
          setIsOpen(false);
        }}
      />
    </>
  );
});

QuickExportButton.displayName = 'QuickExportButton';

/**
 * QuickImportButton组件 - 快速导入按钮
 */
export const QuickImportButton = forwardRef(({
  onImport,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        {...props}
      >
        <Icon name="Upload" size={14} />
        导入配置
      </Button>
      
      <ImportExportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mode="import"
        onImport={(data, options) => {
          onImport?.(data, options);
          setIsOpen(false);
        }}
      />
    </>
  );
});

QuickImportButton.displayName = 'QuickImportButton';
