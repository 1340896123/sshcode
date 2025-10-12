import { ref, reactive } from 'vue'

export function useConnectionManager(emit) {
  // 状态管理
  const activeConnections = ref([])
  const activeTabId = ref(null)
  const connectionTimers = ref(new Map())
  const systemMonitorTimers = ref(new Map())

  // 添加新的SSH连接
  const addConnection = async (sessionData) => {
    console.log('➕ [CONNECTION-MANAGER] 添加新连接到activeConnections:', {
      name: sessionData.name,
      id: sessionData.id
    })

    // 使用 reactive 确保连接对象的响应式
    const connection = reactive({
      id: sessionData.id,
      name: sessionData.name,
      host: sessionData.host,
      port: sessionData.port || 22,
      username: sessionData.username,
      authType: sessionData.authType,
      password: sessionData.password,
      keyPath: sessionData.keyPath,
      keyContent: sessionData.keyContent,
      status: 'connecting', // connecting, connected, failed, disconnected
      connectStep: 0,
      errorMessage: null,
      connectedAt: null,
      terminalOutput: [],
      currentCommand: '',
      showAutocomplete: false,
      lastActivity: new Date(),
      activePanel: 'terminal', // 默认显示终端面板
      systemInfo: {
        cpu: 0,
        memory: 0,
        disk: 0,
        networkUp: 0,
        networkDown: 0,
        lastUpdate: null
      }
    })

    console.log('📋 [CONNECTION-MANAGER] 连接对象创建完成，当前连接数:', activeConnections.value.length)
    activeConnections.value.push(connection)
    activeTabId.value = connection.id

    console.log('🎯 [CONNECTION-MANAGER] 设置活动标签页为:', connection.id)

    // 开始连接过程
    await establishConnection(connection)
  }

  // 建立SSH连接
  const establishConnection = async (connection) => {
    console.log('🔄 [CONNECTION-MANAGER] 开始建立SSH连接:', {
      id: connection.id,
      name: connection.name,
      host: connection.host,
      username: connection.username,
      authType: connection.authType
    })

    try {
      connection.status = 'connecting'
      connection.connectStep = 1
      connection.errorMessage = null

      console.log('📱 [CONNECTION-MANAGER] 状态更新为connecting，发送通知')
      emit('show-notification', `正在连接到 ${connection.host}...`, 'info')

      // 模拟连接步骤
      console.log('⏳ [CONNECTION-MANAGER] 开始模拟连接步骤')
      await simulateConnectionStep(connection, 2, 1000) // 身份验证
      console.log('✓ [CONNECTION-MANAGER] 身份验证步骤完成')
      await simulateConnectionStep(connection, 3, 1500) // 建立连接
      console.log('✓ [CONNECTION-MANAGER] 建立连接步骤完成')

      // 实际SSH连接
      if (window.electronAPI) {
        console.log('🌐 [CONNECTION-MANAGER] 使用ElectronAPI进行真实SSH连接')

        const connectionParams = {
          id: connection.id,
          host: connection.host,
          port: connection.port,
          username: connection.username,
          password: connection.password,
          privateKey: connection.keyContent,
          authType: connection.authType
        }

        console.log('📤 [CONNECTION-MANAGER] 发送SSH连接参数:', {
          id: connectionParams.id,
          host: connectionParams.host,
          port: connectionParams.port,
          username: connectionParams.username,
          authType: connectionParams.authType,
          hasPassword: !!connectionParams.password,
          hasPrivateKey: !!connectionParams.privateKey
        })

        const result = await window.electronAPI.sshConnect(connectionParams)

        console.log('📥 [CONNECTION-MANAGER] SSH连接结果:', {
          success: result.success,
          message: result.message,
          error: result.error
        })

        if (result.success) {
          console.log('🎉 [CONNECTION-MANAGER] SSH连接成功，更新状态')
          connection.status = 'connected'
          connection.connectedAt = new Date()
          connection.errorMessage = null

          addTerminalOutput(connection, {
            type: 'success',
            content: `成功连接到 ${connection.host}`,
            timestamp: new Date()
          })

          addTerminalOutput(connection, {
            type: 'info',
            content: `欢迎 ${connection.username}@${connection.host}`,
            timestamp: new Date()
          })

          emit('show-notification', `已连接到 ${connection.name}`, 'success')

          // 启动连接监控
          startConnectionMonitoring(connection)
          console.log('👁️ [CONNECTION-MANAGER] 连接监控已启动')
          
          // 启动系统监控
          startSystemMonitoring(connection)
          console.log('📊 [CONNECTION-MANAGER] 系统监控已启动')

        } else {
          console.error('💥 [CONNECTION-MANAGER] SSH连接失败:', result.error)
          connection.status = 'failed'
          connection.errorMessage = result.error

          addTerminalOutput(connection, {
            type: 'error',
            content: `连接失败: ${result.error}`,
            timestamp: new Date()
          })

          emit('show-notification', `连接失败: ${result.error}`, 'error')
        }
      } else {
        console.log('🔧 [CONNECTION-MANAGER] 开发模式：模拟连接成功')
        // 开发模式模拟连接成功
        setTimeout(() => {
          connection.status = 'connected'
          connection.connectedAt = new Date()

          addTerminalOutput(connection, {
            type: 'success',
            content: `成功连接到 ${connection.host} (开发模式)`,
            timestamp: new Date()
          })

          emit('show-notification', `已连接到 ${connection.name}`, 'success')
          startConnectionMonitoring(connection)
        }, 2000)
      }
    } catch (error) {
      console.error('💥 [CONNECTION-MANAGER] 连接异常:', error)
      connection.status = 'failed'
      connection.errorMessage = error.message

      addTerminalOutput(connection, {
        type: 'error',
        content: `连接异常: ${error.message}`,
        timestamp: new Date()
      })

      emit('show-notification', `连接异常: ${error.message}`, 'error')
    }

    console.log('🏁 [CONNECTION-MANAGER] 连接尝试完成，最终状态:', connection.status)
  }

  // 模拟连接步骤
  const simulateConnectionStep = (connection, step, delay) => {
    return new Promise(resolve => {
      setTimeout(() => {
        connection.connectStep = step
        resolve()
      }, delay)
    })
  }

  // 添加终端输出
  const addTerminalOutput = (connection, line) => {
    connection.terminalOutput.push(line)

    // 限制输出历史记录
    if (connection.terminalOutput.length > 1000) {
      connection.terminalOutput = connection.terminalOutput.slice(-500)
    }
  }

  // 切换标签
  const switchTab = (connectionId) => {
    activeTabId.value = connectionId
    const connection = activeConnections.value.find(c => c.id === connectionId)
    if (connection) {
      connection.lastActivity = new Date()
    }
  }

  // 断开连接
  const disconnectConnection = async (connectionId) => {
    const connection = activeConnections.value.find(c => c.id === connectionId)
    if (!connection) return

    try {
      connection.status = 'disconnected'

      if (window.electronAPI) {
        await window.electronAPI.sshDisconnect(connectionId)
      }

      addTerminalOutput(connection, {
        type: 'info',
        content: '连接已断开',
        timestamp: new Date()
      })

      emit('show-notification', `已断开 ${connection.name} 的连接`, 'info')

      // 停止连接监控
      stopConnectionMonitoring(connectionId)
      
      // 停止系统监控
      stopSystemMonitoring(connectionId)

    } catch (error) {
      emit('show-notification', `断开连接失败: ${error.message}`, 'error')
    }
  }

  // 重新连接
  const reconnectConnection = async (connection) => {
    await establishConnection(connection)
  }

  // 关闭连接
  const closeConnection = async (connectionId) => {
    const connection = activeConnections.value.find(c => c.id === connectionId)
    if (!connection) return

    // 先断开连接
    if (connection.status === 'connected') {
      await disconnectConnection(connectionId)
    }

    // 移除连接
    const index = activeConnections.value.findIndex(c => c.id === connectionId)
    if (index > -1) {
      activeConnections.value.splice(index, 1)
    }

    // 如果关闭的是当前活动标签，切换到其他标签
    if (activeTabId.value === connectionId) {
      activeTabId.value = activeConnections.value.length > 0
        ? activeConnections.value[activeConnections.value.length - 1].id
        : null
    }

    emit('show-notification', `已关闭 ${connection.name}`, 'info')
  }

  // 连接监控
  const startConnectionMonitoring = (connection) => {
    const timer = setInterval(() => {
      if (connection.status === 'connected') {
        // 检查连接状态
        checkConnectionHealth(connection)
      }
    }, 30000) // 每30秒检查一次

    connectionTimers.value.set(connection.id, timer)
  }

  const stopConnectionMonitoring = (connectionId) => {
    const timer = connectionTimers.value.get(connectionId)
    if (timer) {
      clearInterval(timer)
      connectionTimers.value.delete(connectionId)
    }
  }

  const checkConnectionHealth = async (connection) => {
    try {
      if (window.electronAPI) {
        // 发送心跳命令检查连接状态
        await window.electronAPI.sshExecute(connection.id, 'echo "heartbeat"')
      }
    } catch (error) {
      connection.status = 'disconnected'
      addTerminalOutput(connection, {
        type: 'warning',
        content: '连接已丢失',
        timestamp: new Date()
      })
      emit('show-notification', `${connection.name} 连接已丢失`, 'warning')
    }
  }

  // 系统监控
  const startSystemMonitoring = (connection) => {
    // 立即获取一次系统信息
    updateSystemInfo(connection)
    
    // 每5秒更新一次系统信息
    const timer = setInterval(() => {
      if (connection.status === 'connected') {
        updateSystemInfo(connection)
      }
    }, 5000)

    systemMonitorTimers.value.set(connection.id, timer)
  }

  const stopSystemMonitoring = (connectionId) => {
    const timer = systemMonitorTimers.value.get(connectionId)
    if (timer) {
      clearInterval(timer)
      systemMonitorTimers.value.delete(connectionId)
    }
  }

  const updateSystemInfo = async (connection) => {
    try {
      if (window.electronAPI && connection.status === 'connected') {
        // 通过SSH命令获取系统信息
        const systemInfo = await fetchSystemInfo(connection)
        connection.systemInfo = {
          ...systemInfo,
          lastUpdate: new Date()
        }
      } else {
        // 开发模式模拟系统信息
        connection.systemInfo = generateMockSystemInfo()
      }
    } catch (error) {
      console.error('获取系统信息失败:', error)
      // 使用模拟数据作为后备
      connection.systemInfo = generateMockSystemInfo()
    }
  }

  const fetchSystemInfo = async (connection) => {
    try {
      // 获取CPU使用率
      const cpuResult = await window.electronAPI.sshExecute(connection.id, "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'")
      const cpu = parseFloat(cpuResult.output.trim()) || 0

      // 获取内存使用率
      const memResult = await window.electronAPI.sshExecute(connection.id, "free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'")
      const memory = parseFloat(memResult.output.trim()) || 0

      // 获取磁盘使用率
      const diskResult = await window.electronAPI.sshExecute(connection.id, "df -h / | tail -1 | awk '{print $5}' | sed 's/%//'")
      const disk = parseFloat(diskResult.output.trim()) || 0

      // 获取网络使用情况（简化版本）
      const networkResult = await window.electronAPI.sshExecute(connection.id, "cat /proc/net/dev | grep eth0 | awk '{print $2, $10}' || cat /proc/net/dev | grep enp | awk '{print $2, $10}' || echo '0 0'")
      const networkData = networkResult.output.trim().split(' ')
      const networkDown = parseInt(networkData[0]) || 0
      const networkUp = parseInt(networkData[1]) || 0

      return {
        cpu: Math.round(cpu),
        memory: Math.round(memory),
        disk: Math.round(disk),
        networkDown: networkDown,
        networkUp: networkUp
      }
    } catch (error) {
      console.error('获取系统信息命令执行失败:', error)
      return generateMockSystemInfo()
    }
  }

  const generateMockSystemInfo = () => {
    return {
      cpu: Math.floor(Math.random() * 30) + 10, // 10-40%
      memory: Math.floor(Math.random() * 40) + 30, // 30-70%
      disk: Math.floor(Math.random() * 20) + 20, // 20-40%
      networkDown: Math.floor(Math.random() * 1024 * 1024), // 0-1MB/s
      networkUp: Math.floor(Math.random() * 512 * 1024), // 0-512KB/s
      lastUpdate: new Date()
    }
  }

  // 处理外部连接请求
  const handleSessionConnected = (sessionData) => {
    console.log('📬 [CONNECTION-MANAGER] 收到handleSessionConnected调用:', {
      name: sessionData.name,
      id: sessionData.id,
      host: sessionData.host
    })
    addConnection(sessionData)
  }

  return {
    // 状态
    activeConnections,
    activeTabId,
    connectionTimers,
    systemMonitorTimers,

    // 方法
    addConnection,
    handleSessionConnected,
    switchTab,
    closeConnection,
    disconnectConnection,
    reconnectConnection,
    startConnectionMonitoring,
    stopConnectionMonitoring,
    startSystemMonitoring,
    stopSystemMonitoring,
    addTerminalOutput,
    updateSystemInfo
  }
}
