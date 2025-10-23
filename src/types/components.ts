/**
 * Component props and UI related types
 */

import type { SSHConnectionConfig, Session } from './ssh.js';
import type { FileNode } from './file.js';

export interface ConnectionModalProps {
  visible: boolean;
  connection?: SSHConnectionConfig | null;
  onSave: (connection: SSHConnectionConfig) => void;
  onCancel: () => void;
}

export interface FileManagerProps {
  session: Session;
  onFileSelect: (file: FileNode) => void;
}
