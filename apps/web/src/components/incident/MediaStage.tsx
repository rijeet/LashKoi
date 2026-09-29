import type { IncidentMediaDto } from '@/types/api';
import type { MediaTab } from '@/components/incident/MediaTabs';
import { toYoutubeEmbedUrl } from '@/lib/youtube';
import { toFacebookEmbedUrl } from '@/lib/facebook';

type Props = {
  tab: MediaTab;
  media: IncidentMediaDto;
  caption?: string | null;
};

export function MediaStage({ tab, media, caption }: Props) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
      {tab === 'image' && media.image && (
        <img src={media.image} alt="" className="h-full w-full object-cover" />
      )}
      {tab === 'youtube' && media.youtube && (
        <iframe
          className="h-full w-full"
          src={toYoutubeEmbedUrl(media.youtube) ?? ''}
          title="YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      {tab === 'facebook' && media.facebook && (
        <iframe
          className="h-full w-full"
          src={toFacebookEmbedUrl(media.facebook) ?? ''}
          title="Facebook"
          allowFullScreen
        />
      )}
      {caption && (
        <span className="absolute bottom-2 left-2 rounded bg-slate-950/80 px-2 py-0.5 text-[10px] text-slate-300">
          {caption}
        </span>
      )}
    </div>
  );
}
