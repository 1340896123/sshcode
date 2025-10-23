/**
 * Component props and UI related types
 */

import type { SSHConnectionConfig, Session } from './ssh.ts';
import type { FileNode } from './file.ts';

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
