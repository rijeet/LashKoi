import { SlugService } from '@bll/services/incidents/SlugService';

describe('SlugService', () => {
  const slug = new SlugService();

  it('slugifies titles', () => {
    expect(slug.slugify('Studio Vandalised!!!')).toBe('studio-vandalised');
  });

  it('ensures unique slugs', async () => {
    const taken = new Set(['foo', 'foo-2']);
    const result = await slug.ensureUnique('foo', async (s) => taken.has(s));
    expect(result).toBe('foo-3');
  });
});
