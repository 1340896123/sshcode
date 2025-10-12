import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * ARIA上下文
 */
const ARIAContext = createContext({
  announcements: [],
  announce: () => {},
  clearAnnouncements: () => {},
  setFocusTrap: () => {},
  removeFocusTrap: () => {},
  liveRegions: {},
  createLiveRegion: () => {},
  updateLiveRegion: () => {},
  removeLiveRegion: () => {}
});

/**
 * ARIAProvider组件 - ARIA完整支持组件
 */
export function ARIAProvider({ children }) {
  const [announcements, setAnnouncements] = useState([]);
  const [focusTraps, setFocusTraps] = useState(new Set());
  const [liveRegions, setLiveRegions] = useState({});

  // 屏幕阅读器公告
  const announce = (message, priority = 'polite') => {
    const id = Date.now();
    setAnnouncements(prev => [...prev, { id, message, priority }]);
    
    // 自动清理公告
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(ann => ann.id !== id));
    }, 1000);
  };

  const clearAnnouncements = () => {
    setAnnouncements([]);
  };

  // 焦点陷阱管理
  const setFocusTrap = (elementId) => {
    setFocusTraps(prev => new Set(prev).add(elementId));
  };

  const removeFocusTrap = (elementId) => {
    setFocusTraps(prev => {
      const newSet = new Set(prev);
      newSet.delete(elementId);
      return newSet;
    });
  };

  // Live Region管理
  const createLiveRegion = (id, options = {}) => {
    const { priority = 'polite', atomic = false, relevant = 'additions text' } = options;
    setLiveRegions(prev => ({
      ...prev,
      [id]: { priority, atomic, relevant, messages: [] }
    }));
  };

  const updateLiveRegion = (id, message) => {
    setLiveRegions(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        messages: [...(prev[id]?.messages || []), message]
      }
    }));
  };

  const removeLiveRegion = (id) => {
    setLiveRegions(prev => {
      const newRegions = { ...prev };
      delete newRegions[id];
      return newRegions;
    });
  };

  // 键盘导航处理
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Tab键导航增强
      if (event.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }

      // Escape键处理
      if (event.key === 'Escape') {
        // 查找当前活动的模态或对话框
        const activeModal = document.querySelector('[role="dialog"]');
        if (activeModal) {
          const closeButton = activeModal.querySelector('button[aria-label*="关闭"], button[aria-label*="Close"]');
          closeButton?.click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const contextValue = {
    announcements,
    announce,
    clearAnnouncements,
    setFocusTrap,
    removeFocusTrap,
    liveRegions,
    createLiveRegion,
    updateLiveRegion,
    removeLiveRegion
  };

  return (
    <ARIAContext.Provider value={contextValue}>
      {children}
      
      {/* 屏幕阅读器公告区域 */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcements.map(ann => (
          <div key={ann.id}>{ann.message}</div>
        ))}
      </div>

      {/* Live Regions */}
      {Object.entries(liveRegions).map(([id, region]) => (
        <div
          key={id}
          className="sr-only"
          aria-live={region.priority}
          aria-atomic={region.atomic}
          aria-relevant={region.relevant}
        >
          {region.messages.map((msg, index) => (
            <div key={index}>{msg}</div>
          ))}
        </div>
      ))}
    </ARIAContext.Provider>
  );
}

// Hook for using ARIA features
export const useARIA = () => {
  const context = useContext(ARIAContext);
  if (!context) {
    throw new Error('useARIA must be used within an ARIAProvider');
  }
  return context;
};

// 预设Hook
export const useAnnouncer = () => {
  const { announce } = useARIA();
  return { announce };
};

export const useLiveRegion = (id, options = {}) => {
  const { createLiveRegion, updateLiveRegion, removeLiveRegion } = useARIA();
  
  useEffect(() => {
    createLiveRegion(id, options);
    return () => removeLiveRegion(id);
  }, [id, options]);

  return { updateLiveRegion: (message) => updateLiveRegion(id, message) };
};

export const useFocusTrap = (elementId) => {
  const { setFocusTrap, removeFocusTrap } = useARIA();
  
  useEffect(() => {
    setFocusTrap(elementId);
    return () => removeFocusTrap(elementId);
  }, [elementId]);
};

export default ARIAProvider;
