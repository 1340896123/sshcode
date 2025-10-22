// 文件图标映射 - 优化性能的静态映射
export const FILE_ICONS = {
  // 文档
  txt: '📄',
  md: '📝',
  pdf: '📕',
  doc: '📘',
  docx: '📘',
  xls: '📗',
  xlsx: '📗',
  ppt: '📙',
  pptx: '📙',
  odt: '📘',
  ods: '📗',
  odp: '📙',

  // 代码
  js: '📜',
  jsx: '⚛️',
  ts: '📘',
  tsx: '⚛️',
  html: '🌐',
  htm: '🌐',
  css: '🎨',
  scss: '🎨',
  sass: '🎨',
  less: '🎨',
  json: '📋',
  xml: '📄',
  yaml: '📄',
  yml: '📄',
  py: '🐍',
  java: '☕',
  cpp: '⚙️',
  c: '⚙️',
  cs: '⚙️',
  go: '🐹',
  rs: '🦀',
  php: '🐘',
  rb: '💎',
  swift: '🍎',
  kt: '🎯',
  dart: '🎯',
  lua: '🌙',
  r: '📊',
  sql: '🗃️',
  sh: '📜',
  bash: '📜',
  zsh: '📜',
  fish: '🐠',
  ps1: '📜',
  bat: '📜',
  cmd: '📜',

  // 配置文件
  config: '⚙️',
  conf: '⚙️',
  ini: '⚙️',
  toml: '⚙️',
  env: '🔐',
  lock: '🔒',
  gitignore: '📝',
  dockerfile: '🐳',
  makefile: '🔧',
  cmake: '🔧',
  gradle: '🐘',
  maven: '🐘',
  package: '📦',
  yarn: '📦',
  npmrc: '📦',

  // 图片
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  gif: '🖼️',
  svg: '🎨',
  ico: '🖼️',
  bmp: '🖼️',
  tiff: '🖼️',
  webp: '🖼️',
  psd: '🎨',
  ai: '🎨',
  eps: '🎨',
  sketch: '🎨',

  // 音频
  mp3: '🎵',
  wav: '🎵',
  flac: '🎵',
  aac: '🎵',
  ogg: '🎵',
  wma: '🎵',
  m4a: '🎵',
  opus: '🎵',

  // 视频
  mp4: '🎬',
  avi: '🎬',
  mkv: '🎬',
  mov: '🎬',
  wmv: '🎬',
  flv: '🎬',
  webm: '🎬',
  m4v: '🎬',
  '3gp': '🎬',
  mpg: '🎬',
  mpeg: '🎬',

  // 压缩包
  zip: '📦',
  rar: '📦',
  '7z': '📦',
  tar: '📦',
  gz: '📦',
  bz2: '📦',
  xz: '📦',
  z: '📦',
  arj: '📦',
  cab: '📦',
  lzh: '📦',
  ace: '📦',
  uue: '📦',
  jar: '📦',
  war: '📦',
  ear: '📦',

  // 可执行文件
  exe: '⚙️',
  msi: '⚙️',
  dmg: '💿',
  pkg: '📦',
  deb: '📦',
  rpm: '📦',
  apk: '📱',
  ipa: '📱',
  app: '📱',
  snap: '📦',
  flatpak: '📦',

  // 系统文件
  dll: '⚙️',
  so: '⚙️',
  dylib: '⚙️',
  sys: '⚙️',
  driver: '🔧',
  bin: '⚙️',
  run: '⚙️',

  // 数据库文件
  db: '🗃️',
  sqlite: '🗃️',
  mdb: '🗃️',
  accdb: '🗃️',

  // 字体文件
  ttf: '🔤',
  otf: '🔤',
  woff: '🔤',
  woff2: '🔤',
  eot: '🔤',

  // 证书和密钥
  crt: '🔐',
  cer: '🔐',
  key: '🔑',
  pem: '🔐',
  p12: '🔐',
  pfx: '🔐',

  // 其他常见文件
  log: '📋',
  tmp: '📄',
  bak: '📄',
  old: '📄',
  backup: '💾',
  torrent: '🔽',
  iso: '💿',
  img: '💿',
  vmdk: '💿',
  vdi: '💿'
};

// 获取文件图标的优化函数
export function getFileIcon(filename) {
  if (!filename) return '📄';

  const parts = filename.split('.');
  if (parts.length < 2) return '📄';

  const extension = parts[parts.length - 1].toLowerCase();
  return FILE_ICONS[extension] || '📄';
}

// 判断是否为目录
export function isDirectory(file) {
  return file.type === 'd' || file.type?.includes('dir');
}

// 格式化文件大小
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 格式化文件权限
export function formatFilePermissions(permissions) {
  if (!permissions) return 'rw-r--r--';

  // 简化权限显示
  if (permissions.length === 9) {
    return permissions.replace(/(.{3})(.{3})(.{3})/, '$1 $2 $3');
  }

  return permissions;
}

// 格式化日期
export function formatDate(timestamp) {
  if (!timestamp) return '-';

  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}