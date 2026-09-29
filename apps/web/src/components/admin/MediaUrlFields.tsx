import { toYoutubeEmbedUrl } from '@/lib/youtube';
import type { IncidentMediaDto } from '@/types/api';

type Props = {
  value: IncidentMediaDto;
  onChange: (media: IncidentMediaDto) => void;
};

export function MediaUrlFields({ value, onChange }: Props) {
  const ytEmbed = value.youtube ? toYoutubeEmbedUrl(value.youtube) : null;

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="text-slate-400">Image URL</span>
        <input
          type="url"
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
          value={value.image ?? ''}
          onChange={(e) => onChange({ ...value, image: e.target.value || undefined })}
          placeholder="https://…"
        />
      </label>
      {value.image && (
        <img src={value.image} alt="" className="max-h-40 rounded-md border border-slate-800" />
      )}
      <label className="block text-sm">
        <span className="text-slate-400">YouTube URL</span>
        <input
          type="url"
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
          value={value.youtube ?? ''}
          onChange={(e) => onChange({ ...value, youtube: e.target.value || undefined })}
        />
      </label>
      {ytEmbed && (
        <iframe
          title="YouTube preview"
          src={ytEmbed}
          className="aspect-video w-full max-w-md rounded-md border border-slate-800"
          allowFullScreen
        />
      )}
      <label className="block text-sm">
        <span className="text-slate-400">Facebook video URL</span>
        <input
          type="url"
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
          value={value.facebook ?? ''}
          onChange={(e) => onChange({ ...value, facebook: e.target.value || undefined })}
        />
      </label>
    </div>
  );
}
