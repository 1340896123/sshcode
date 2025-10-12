import React, { useState, useEffect } from 'react';
import { useSessions } from '../hooks/useElectronAPI';
import { Button } from './ui/primitives/Button';
import { Input } from './ui/primitives/Input';
import { Modal } from './ui/feedback/Modal';
import { Select } from './ui/primitives/Select';
import Textarea from './ui/primitives/Textarea';

function SessionModal({ isOpen, onClose, onShowNotification }) {
  const { sessions, loading, loadSessions, saveSession, deleteSession } = useSessions();
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    host: '',
    port: '22',
    username: '',
    password: '',
    authType: 'password',
    keyPath: '',
    group: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, loadSessions]);

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      host: '',
      port: '22',
      username: '',
      password: '',
      authType: 'password',
      keyPath: '',
      group: '',
      description: ''
    });
    setEditingSession(null);
  };

  const handleNewSession = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditSession = (session) => {
    setFormData(session);
    setEditingSession(session);
    setShowForm(true);
  };

  const handleDeleteSession = async (sessionId) => {
    if (confirm('确定要删除这个会话吗？')) {
      const success = await deleteSession(sessionId);
      if (success) {
        onShowNotification.success('会话已删除');
      } else {
        onShowNotification.error('删除会话失败');
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    const success = await saveSession(formData);
    if (success) {
      onShowNotification.success(editingSession ? '会话已更新' : '会话已创建');
      setShowForm(false);
      resetForm();
    } else {
      onShowNotification.error('保存会话失败');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAuthTypeChange = (e) => {
    const authType = e.target.value;
    setFormData(prev => ({ ...prev, authType, password: '', keyPath: '' }));
  };

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (session.description && session.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SSH会话管理"
      size="large"
    >
          {showForm ? (
            // 会话表单
            <div>
              <h3>{editingSession ? '编辑SSH会话' : '新建SSH会话'}</h3>
              <form onSubmit={handleFormSubmit}>
                <input type="hidden" name="id" value={formData.id} />
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="session-name">会话名称:</label>
                    <Input
                      id="session-name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="例如：生产服务器"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="session-group">分组:</label>
                    <Select
                      id="session-group"
                      name="group"
                      value={formData.group}
                      onChange={handleInputChange}
                    >
                      <option value="">默认分组</option>
                      <option value="production">生产环境</option>
                      <option value="development">开发环境</option>
                      <option value="testing">测试环境</option>
                    </Select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="session-host">主机地址:</label>
                    <Input
                      id="session-host"
                      name="host"
                      value={formData.host}
                      onChange={handleInputChange}
                      placeholder="192.168.1.100 或 example.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="session-port">端口:</label>
                    <Input
                      id="session-port"
                      name="port"
                      type="number"
                      value={formData.port}
                      onChange={handleInputChange}
                      min="1"
                      max="65535"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="session-username">用户名:</label>
                    <Input
                      id="session-username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="root, ubuntu, etc."
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="session-auth-type">认证方式:</label>
                    <Select
                      id="session-auth-type"
                      name="authType"
                      value={formData.authType}
                      onChange={handleAuthTypeChange}
                    >
                      <option value="password">密码认证</option>
                      <option value="key">密钥认证</option>
                    </Select>
                  </div>
                </div>

                {formData.authType === 'password' ? (
                  <div className="form-group">
                    <label htmlFor="session-password">密码:</label>
                    <Input
                      id="session-password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="输入SSH密码"
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="session-key-path">私钥文件路径:</label>
                    <Input
                      id="session-key-path"
                      name="keyPath"
                      value={formData.keyPath}
                      onChange={handleInputChange}
                      placeholder="~/.ssh/id_rsa"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="session-description">描述:</label>
                  <Textarea
                    id="session-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="可选的会话描述信息"
                  />
                </div>

                <div className="form-actions">
                  <Button type="submit">
                    💾 保存会话
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setShowForm(false)}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            // 会话列表
            <div>
              <div className="sessions-toolbar">
                <Button onClick={handleNewSession}>
                  ➕ 新建会话
                </Button>
                <div className="search-box">
                  <Input
                    type="search"
                    placeholder="搜索会话..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
              
              <div className="sessions-list">
                {loading ? (
                  <div className="loading">加载中...</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="empty-state">
                    {searchTerm ? '没有找到匹配的会话' : '还没有创建任何会话'}
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <div key={session.id} className="session-item">
                      <div className="session-info">
                        <h4>{session.name}</h4>
                        <p className="session-details">
                          {session.username}@{session.host}:{session.port}
                        </p>
                        {session.description && (
                          <p className="session-description">{session.description}</p>
                        )}
                        {session.group && (
                          <span className="session-group">{session.group}</span>
                        )}
                      </div>
                      <div className="session-actions">
                        <Button 
                          variant="edit"
                          size="small"
                          onClick={() => handleEditSession(session)}
                        >
                          编辑
                        </Button>
                        <Button 
                          variant="delete"
                          size="small"
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
    </Modal>
  );
}

export default SessionModal;
