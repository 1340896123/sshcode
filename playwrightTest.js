import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // 存储控制台错误和警告
  const consoleMessages = [];
  
  // 监听控制台消息
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      if (msg.location()) {
        console.log(`  位置: ${msg.location().url}:${msg.location().lineNumber}:${msg.location().columnNumber}`);
      }
    }
  });
  
  // 监听页面错误（如 JavaScript 异常）
  page.on('pageerror', (error) => {
    consoleMessages.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack
    });
    console.log('[PAGE ERROR] ' + error.message);
    console.log('堆栈跟踪:', error.stack);
  });
  
  // 监听请求失败
  page.on('requestfailed', (request) => {
    consoleMessages.push({
      type: 'requestfailed',
      url: request.url(),
      failure: request.failure()
    });
    console.log('[REQUEST FAILED] ' + request.url());
    console.log('失败原因:', request.failure());
  });
  
  await page.goto('http://localhost:3002/');
  
  // 等待一段时间让页面完全加载并捕获所有可能的错误
  await page.waitForTimeout(3000);
  
  // 输出捕获到的所有错误和警告
  console.log('\n=== 控制台错误/警告汇总 ===');
  if (consoleMessages.length === 0) {
    console.log('✅ 未发现控制台错误或警告');
  } else {
    console.log(`发现 ${consoleMessages.length} 个问题:`);
    consoleMessages.forEach((msg, index) => {
      console.log(`\n${index + 1}. [${msg.type.toUpperCase()}]`);
      if (msg.text) {
        console.log(`   消息: ${msg.text}`);
      }
      if (msg.message) {
        console.log(`   消息: ${msg.message}`);
      }
      if (msg.location) {
        console.log(`   位置: ${msg.location.url}:${msg.location.lineNumber}:${msg.location.columnNumber}`);
      }
      if (msg.stack) {
        console.log(`   堆栈: ${msg.stack}`);
      }
      if (msg.url) {
        console.log(`   URL: ${msg.url}`);
      }
      if (msg.failure) {
        console.log(`   失败原因: ${msg.failure.errorText}`);
      }
    });
  }
  
  console.log('========================\n');
  
  // 可选：如果发现错误，测试失败
  // const errorCount = consoleMessages.filter(msg => msg.type === 'error' || msg.type === 'pageerror').length;
  // expect(errorCount).toBe(0);
});
