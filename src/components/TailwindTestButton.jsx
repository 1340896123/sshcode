import React, { useState } from 'react';

const TailwindTestButton = () => {
  const [testResults, setTestResults] = useState({
    colors: false,
    spacing: false,
    typography: false,
    layout: false,
    effects: false,
    animations: false,
    responsive: false
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  const runTest = (testType) => {
    setCurrentTest(testType);
    setTestResults(prev => ({
      ...prev,
      [testType]: true
    }));
    
    // 3秒后重置当前测试状态
    setTimeout(() => {
      setCurrentTest('');
    }, 3000);
  };

  const resetTests = () => {
    setTestResults({
      colors: false,
      spacing: false,
      typography: false,
      layout: false,
      effects: false,
      animations: false,
      responsive: false
    });
    setCurrentTest('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 主测试按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
      >
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Tailwind CSS 测试
        </span>
      </button>

      {/* 展开的测试面板 */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-80 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Tailwind CSS 测试面板</h3>
            <button
              onClick={resetTests}
              className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition-colors"
            >
              重置
            </button>
          </div>

          {/* 颜色测试 */}
          <div className="mb-4">
            <button
              onClick={() => runTest('colors')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                testResults.colors 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="font-semibold text-gray-800 dark:text-white mb-2">🎨 颜色测试</div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">red-500</span>
                <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">blue-500</span>
                <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">green-500</span>
                <span className="px-2 py-1 bg-yellow-500 text-black text-xs rounded">yellow-500</span>
                <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded">purple-500</span>
                <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded">gray-500</span>
              </div>
            </button>
          </div>

          {/* 间距测试 */}
          <div className="mb-4">
            <button
              onClick={() => runTest('spacing')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                testResults.spacing 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="font-semibold text-gray-800 dark:text-white mb-2">📏 间距测试</div>
              <div className="space-y-1">
                <div className="h-1 bg-blue-300"></div>
                <div className="h-2 bg-blue-400"></div>
                <div className="h-3 bg-blue-500"></div>
                <div className="h-4 bg-blue-600"></div>
              </div>
            </button>
          </div>

          {/* 字体测试 */}
          <div className="mb-4">
            <button
              onClick={() => runTest('typography')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                testResults.typography 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="font-semibold text-gray-800 dark:text-white mb-2">✏️ 字体测试</div>
              <div className="space-y-1">
                <div className="text-xs font-light">超小字体 font-light text-xs</div>
                <div className="text-sm font-normal">小字体 font-normal text-sm</div>
                <div className="text-base font-medium">基础字体 font-medium text-base</div>
                <div className="text-lg font-bold">大字体 font-bold text-lg</div>
              </div>
            </button>
          </div>

          {/* 布局测试 */}
          <div className="mb-4">
            <button
              onClick={() => runTest('layout')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                testResults.layout 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="font-semibold text-gray-800 dark:text-white mb-2">📐 布局测试</div>
              <div className="grid grid-cols-3 gap-1">
                <div className="bg-blue-200 h-8 rounded"></div>
                <div className="bg-blue-300 h-8 rounded"></div>
                <div className="bg-blue-400 h-8 rounded"></div>
                <div className="bg-blue-500 h-8 rounded col-span-2"></div>
                <div className="bg-blue-600 h-8 rounded"></div>
              </div>
            </button>
          </div>

          {/* 效果测试 */}
          <div className="mb-4">
            <button
              onClick={() => runTest('effects')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                testResults.effects 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="font-semibold text-gray-800 dark:text-white mb-2">✨ 效果测试</div>
              <div className="flex gap-2 items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full shadow-md"></div>
                <div className="w-8 h-8 bg-green-500 rounded-lg shadow-lg"></div>
                <div className="w-8 h-8 bg-purple-500 rounded-sm shadow-xl opacity-75"></div>
              </div>
            </button>
          </div>

          {/* 动画测试 */}
          <div className="mb-4">
            <button
              onClick={() => runTest('animations')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                testResults.animations 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="font-semibold text-gray-800 dark:text-white mb-2">🎬 动画测试</div>
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-red-500 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-blue-500 rounded animate-bounce"></div>
                <div className="w-8 h-8 bg-green-500 rounded animate-spin"></div>
              </div>
            </button>
          </div>

          {/* 响应式测试 */}
          <div className="mb-4">
            <button
              onClick={() => runTest('responsive')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                testResults.responsive 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="font-semibold text-gray-800 dark:text-white mb-2">📱 响应式测试</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 bg-indigo-500 text-white text-center p-2 rounded text-xs sm:text-sm">
                  <span className="hidden sm:inline">桌面:</span> <span className="sm:hidden">移动:</span> 响应式
                </div>
              </div>
            </button>
          </div>

          {/* 测试状态指示器 */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">测试状态:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(testResults).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-gray-600 dark:text-gray-400">{key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TailwindTestButton;
