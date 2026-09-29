import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getFeaturedBanners } from '@/services/get-banners';
import type { Lang } from '@/types/api';

type Props = {
  lang: Lang;
};

export function BreakingBannerStrip({ lang }: Props) {
  const { data } = useQuery({
    queryKey: queryKeys.banners(lang),
    queryFn: () => getFeaturedBanners(lang),
    staleTime: 60_000,
  });

  const breaking = data?.find((b) => b.sectionType === 'breaking') ?? data?.[0];
  if (!breaking?.caption) return null;

  return (
    <div
      className="pointer-events-none absolute top-[3.25rem] right-0 left-0 z-[390] border-b border-amber-900/50 bg-amber-950/90 px-3 py-1.5 text-center text-xs font-semibold tracking-wide text-amber-100"
      role="status"
    >
      {breaking.caption}
    </div>
  );
}
