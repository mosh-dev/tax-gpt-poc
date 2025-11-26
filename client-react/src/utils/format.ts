export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 KB/s';

  const k = 1024;
  if (bytesPerSecond < k) {
    return `${bytesPerSecond.toFixed(0)} B/s`;
  }

  if (bytesPerSecond < k * k) {
    return `${(bytesPerSecond / k).toFixed(1)} KB/s`;
  }

  return `${(bytesPerSecond / (k * k)).toFixed(1)} MB/s`;
}

export function formatTime(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return '--';

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}
