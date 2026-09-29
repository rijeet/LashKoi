import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { icons } from 'lucide-react';

export function incidentMarkerHtml(
  iconKey: string,
  color: string,
  selected: boolean,
): string {
  const Icon =
    icons[iconKey as keyof typeof icons] ?? icons.Bug;
  const size = selected ? 18 : 14;
  const svg = renderToStaticMarkup(
    createElement(Icon, {
      size,
      color: '#ffffff',
      strokeWidth: 2.5,
    }),
  );
  return `<div class="lk-marker${selected ? ' is-selected' : ''}" style="--lk-color:${color}">${svg}</div>`;
}
