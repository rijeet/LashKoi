export function parseJwtExpiryToSeconds(value: string): number {
  return Math.floor(parseJwtExpiryToMs(value) / 1000);
}

export function parseJwtExpiryToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    return 15 * 60 * 1000;
  }
  const n = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * (multipliers[unit] ?? 1000);
}
