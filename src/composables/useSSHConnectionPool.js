import { ref, reactive } from 'vue';

export function useSSHConnectionPool() {
  const connectionPool = ref(new Map());
  const commandQueue = ref(new Map());
  const executingCommands = ref(new Set());

  // 创建持久SSH连接
  const createPersistentConnection = async (connectionId, connectionParams) => {
    try {
      console.log('🔗 [SSH-POOL] 创建持久连接:', connectionId);

      if (!window.electronAPI) {
        throw new Error('ElectronAPI不可用');
      }

      // 建立基础连接
      const connectResult = await window.electronAPI.sshConnect(connectionParams);
      if (!connectResult.success) {
        throw new Error(connectResult.error);
      }

      // 创建连接池条目
      const poolEntry = reactive({
        id: connectionId,
        connectionParams,
        status: 'connected',
        lastUsed: Date.now(),
        commandHistory: [],
        errorCount: 0,
        lastError: null,
        isExecuting: false,
        commandBuffer: []
      });

      connectionPool.value.set(connectionId, poolEntry);
      console.log('✅ [SSH-POOL] 持久连接创建成功:', connectionId);

      return poolEntry;
    } catch (error) {
      console.error('❌ [SSH-POOL] 创建持久连接失败:', error);
      throw error;
    }
  };

  // 批量执行命令
  const executeBatchCommand = async connectionId => {
    const poolEntry = connectionPool.value.get(connectionId);
    if (!poolEntry || poolEntry.status !== 'connected') {
      throw new Error(`连接 ${connectionId} 不存在或未连接`);
    }

    if (poolEntry.isExecuting) {
      console.log('⏳ [SSH-POOL] 命令正在执行中，跳过:', connectionId);
      return null;
    }

    try {
      poolEntry.isExecuting = true;

      // 构建批量监控命令
      const batchCommand = buildSystemMonitorCommand();
      console.log('📊 [SSH-POOL] 执行批量监控命令:', connectionId);

      const startTime = Date.now();
      const result = await window.electronAPI.sshExecute(connectionId, batchCommand);
      const executionTime = Date.now() - startTime;

      poolEntry.lastUsed = Date.now();
      poolEntry.errorCount = 0;
      poolEntry.lastError = null;

      // 解析批量命令结果
      const parsedData = parseBatchOutput(result.output);

      //   console.log('✅ [SSH-POOL] 批量命令执行成功:', {
      //     connectionId,
      //     executionTime: `${executionTime}ms`,
      //     dataSize: Object.keys(parsedData).length
      //   })

      return parsedData;
    } catch (error) {
      poolEntry.errorCount++;
      poolEntry.lastError = error.message;
      poolEntry.lastUsed = Date.now();

      console.error('❌ [SSH-POOL] 批量命令执行失败:', {
        connectionId,
        error: error.message,
        errorCount: poolEntry.errorCount
      });

      // 错误次数过多时标记连接为不可用
      if (poolEntry.errorCount >= 3) {
        poolEntry.status = 'error';
        console.warn('⚠️ [SSH-POOL] 连接标记为错误状态:', connectionId);
      }

      throw error;
    } finally {
      poolEntry.isExecuting = false;
    }
  };

  // 构建系统监控批量命令
  const buildSystemMonitorCommand = () => {
    return `
# 获取CPU使用率
CPU_USAGE=$(top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}' || echo "0")

# 获取内存使用率  
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}' || echo "0")

# 获取磁盘使用率
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//' || echo "0")

# 获取网络数据
NETWORK_DATA=$(cat /proc/net/dev | grep -E '(eth0|enp|ens|eno|wlan0|wlp)' | head -1 | awk '{print $2, $10}' || echo "0 0")

# 获取系统负载
LOAD_AVG=$(cat /proc/loadavg | awk '{print $1, $2, $3}' || echo "0 0 0")

# 获取进程信息
PROCESS_COUNT=$(ps aux | wc -l || echo "0")

# 输出JSON格式结果
echo "CPU_USAGE:$CPU_USAGE"
echo "MEMORY_USAGE:$MEMORY_USAGE" 
echo "DISK_USAGE:$DISK_USAGE"
echo "NETWORK_DATA:$NETWORK_DATA"
echo "LOAD_AVG:$LOAD_AVG"
echo "PROCESS_COUNT:$PROCESS_COUNT"
echo "TIMESTAMP:$(date +%s)"
`.trim();
  };

  // 解析批量命令输出
  const parseBatchOutput = output => {
    const lines = output.trim().split('\n');
    const result = {};

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        result[key] = value;
      }
    });

    // 转换为数字类型
    const parsed = {
      cpu: parseFloat(result.CPU_USAGE) || 0,
      memory: parseFloat(result.MEMORY_USAGE) || 0,
      disk: parseFloat(result.DISK_USAGE) || 0,
      timestamp: parseInt(result.TIMESTAMP) || Date.now(),
      processCount: parseInt(result.PROCESS_COUNT) || 0
    };

    // 解析网络数据
    if (result.NETWORK_DATA) {
      const [down, up] = result.NETWORK_DATA.split(' ').map(v => parseInt(v) || 0);
      parsed.networkDown = down;
      parsed.networkUp = up;
    }

    // 解析负载平均值
    if (result.LOAD_AVG) {
      const [load1, load5, load15] = result.LOAD_AVG.split(' ').map(v => parseFloat(v) || 0);
      parsed.loadAverage = { load1, load5, load15 };
    }

    return parsed;
  };

  // 检查连接健康状态
  const checkConnectionHealth = async connectionId => {
    const poolEntry = connectionPool.value.get(connectionId);
    if (!poolEntry) return false;

    try {
      // 简单的心跳命令
      await window.electronAPI.sshExecute(connectionId, 'echo "heartbeat"');
      poolEntry.errorCount = 0;
      poolEntry.status = 'connected';
      return true;
    } catch (error) {
      poolEntry.errorCount++;
      poolEntry.lastError = error.message;

      if (poolEntry.errorCount >= 3) {
        poolEntry.status = 'error';
      }

      return false;
    }
  };

  // 关闭持久连接
  const closePersistentConnection = async connectionId => {
    const poolEntry = connectionPool.value.get(connectionId);
    if (!poolEntry) return;

    try {
      if (window.electronAPI) {
        await window.electronAPI.sshDisconnect(connectionId);
      }

      connectionPool.value.delete(connectionId);
      console.log('🔌 [SSH-POOL] 持久连接已关闭:', connectionId);
    } catch (error) {
      console.error('❌ [SSH-POOL] 关闭持久连接失败:', error);
    }
  };

  // 获取连接状态
  const getConnectionStatus = connectionId => {
    const poolEntry = connectionPool.value.get(connectionId);
    if (!poolEntry) return null;

    return {
      id: poolEntry.id,
      status: poolEntry.status,
      lastUsed: poolEntry.lastUsed,
      errorCount: poolEntry.errorCount,
      lastError: poolEntry.lastError,
      isExecuting: poolEntry.isExecuting
    };
  };

  // 清理无效连接
  const cleanupConnections = () => {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5分钟超时

    for (const [connectionId, poolEntry] of connectionPool.value.entries()) {
      if (now - poolEntry.lastUsed > timeout || poolEntry.status === 'error') {
        console.log('🧹 [SSH-POOL] 清理超时或错误连接:', connectionId);
        closePersistentConnection(connectionId);
      }
    }
  };

  // 启动定期清理
  const startCleanupTimer = () => {
    setInterval(cleanupConnections, 60000); // 每分钟清理一次
  };

  return {
    connectionPool,
    createPersistentConnection,
    executeBatchCommand,
    checkConnectionHealth,
    closePersistentConnection,
    getConnectionStatus,
    cleanupConnections,
    startCleanupTimer
  };
}
