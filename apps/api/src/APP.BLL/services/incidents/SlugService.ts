export class SlugService {
  slugify(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);
  }

  async ensureUnique(
    base: string,
    exists: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    let slug = base || 'incident';
    if (!(await exists(slug))) return slug;
    for (let i = 2; i < 100; i++) {
      const candidate = `${base}-${i}`.slice(0, 220);
      if (!(await exists(candidate))) return candidate;
    }
    return `${base}-${Date.now()}`.slice(0, 220);
  }
}
