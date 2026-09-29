export class RefCodeService {
  format(year: number, seq: number): string {
    return `LK-${year}-${String(seq).padStart(6, '0')}`;
  }
}
