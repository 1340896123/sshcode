/**
 * Component props and UI related types
 */

import type { SSHConnection } from './ssh.js';
import type { FileNode } from './file.js';

export interface ConnectionModalProps {
  visible: boolean;
  connection?: SSHConnection | null;
  onSave: (connection: SSHConnection) => void;
  onCancel: () => void;
}

export interface FileManagerProps {
  connection: SSHConnection;
  onFileSelect: (file: FileNode) => void;
}
