/**
 * Formats a raw numeric value based on its unit, quantizing large values for readability.
 * Prefers GB over MB for storage/data-transfer units.
 */
export function formatValue(value: number, unit: string): string {
  if (value === undefined || value === null) return '0';

  const lowerUnit = unit.toLowerCase();

  // Handle bytes/bits/sizes
  if (lowerUnit === 'bytes' || lowerUnit === 'kilobytes' || lowerUnit === 'megabytes' || lowerUnit === 'gigabytes') {
    let bytes = value;
    if (lowerUnit === 'kilobytes') bytes *= 1024;
    if (lowerUnit === 'megabytes') bytes *= 1024 * 1024;
    if (lowerUnit === 'gigabytes') bytes *= 1024 * 1024 * 1024;

    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    } else if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    }
    return bytes.toFixed(0) + ' B';
  }

  // Handle time units
  if (lowerUnit === 'seconds' || lowerUnit === 'milliseconds' || lowerUnit === 'microseconds') {
    let ms = value;
    if (lowerUnit === 'seconds') ms *= 1000;
    if (lowerUnit === 'microseconds') ms /= 1000;

    if (ms >= 1000) {
      return (ms / 1000).toFixed(2) + ' s';
    }
    return ms.toFixed(2) + ' ms';
  }

  // Handle percentages
  if (unit === '%' || lowerUnit === 'percent') {
    return value.toFixed(2) + '%';
  }

  // Large counts (K, M, B)
  if (value >= 1000000000) return (value / 1000000000).toFixed(2) + 'B';
  if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(2) + 'K';

  return value.toFixed(value % 1 === 0 ? 0 : 2);
}
