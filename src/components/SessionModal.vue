<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="$emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>会话管理</h2>
            <button class="close-btn" @click="$emit('close')">×</button>
          </div>
          <div class="modal-body">
            <div class="empty-sessions">
              <div class="empty-icon">🔗</div>
              <p>暂无会话配置</p>
              <p class="text-muted">点击"新建会话"开始创建SSH连接</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="primary-btn" @click="createNewSession">
              新建会话
            </button>
            <button class="secondary-btn" @click="$emit('close')">取消</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
export default {
  name: "SessionModal",
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["close", "show-notification"],
  setup(props, { emit }) {
    const createNewSession = () => {
      emit("show-notification", "会话创建功能即将推出", "info");
    };

    return {
      createNewSession,
    };
  },
};
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: z-index(modal);
  padding: spacing(lg);
}

.modal-content {
  background: color(surface);
  border-radius: border-radius(lg);
  box-shadow: shadow(xl);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border: 1px solid color(border);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: spacing(lg);
  border-bottom: 1px solid color(border);
}

.modal-header h2 {
  margin: 0;
  font-size: font-size(xl);
  color: color(text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: color(text-muted);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: border-radius(full);
  transition: all transition(fast) ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: color(text-primary);
  }
}

.modal-body {
  flex: 1;
  padding: spacing(lg);
  overflow-y: auto;
}

.empty-sessions {
  text-align: center;
  padding: spacing(xxl) 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: spacing(md);
}

.empty-sessions p {
  margin: spacing(sm) 0;
  color: color(text-secondary);
}

.text-muted {
  color: color(text-muted) !important;
  font-size: font-size(sm);
}

.modal-footer {
  display: flex;
  gap: spacing(sm);
  justify-content: flex-end;
  padding: spacing(lg);
  border-top: 1px solid color(border);
}

.primary-btn {
  @include button-base;
  background: linear-gradient(135deg, color(primary), color(primary-light));
  color: color(white);

  &:hover {
    background: linear-gradient(135deg, color(primary-light), color(primary));
  }
}

.secondary-btn {
  @include button-base;
  background: color(bg-tertiary);
  color: color(text-secondary);
  border: 1px solid color(border);

  &:hover {
    background: color(bg-secondary);
    color: color(text-primary);
  }
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content {
  transition: all 0.3s ease;
  transform: scale(0.9);
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}
</style>