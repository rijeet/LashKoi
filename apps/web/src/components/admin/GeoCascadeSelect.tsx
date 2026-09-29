import { useQuery } from '@tanstack/react-query';
import { getDivisions, getUpazilas } from '@/services/get-boundaries';
import { useDistrictOptions } from '@/hooks/useDistrictOptions';
import type { Lang } from '@/types/api';

type Props = {
  lang: Lang;
  divisionPcode: string;
  districtPcode: string;
  upazilaPcode: string;
  onChange: (next: {
    divisionPcode: string;
    districtPcode: string;
    upazilaPcode: string;
  }) => void;
};

export function GeoCascadeSelect({
  lang,
  divisionPcode,
  districtPcode,
  upazilaPcode,
  onChange,
}: Props) {
  const divisions = useQuery({
    queryKey: ['boundaries', 'divisions', lang],
    queryFn: () => getDivisions(lang),
    staleTime: 86400_000,
  });
  const districts = useDistrictOptions(divisionPcode, lang);
  const upazilas = useQuery({
    queryKey: ['boundaries', 'upazilas', districtPcode, lang],
    queryFn: () => getUpazilas(districtPcode, lang),
    enabled: Boolean(districtPcode),
    staleTime: 86400_000,
  });

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block text-sm">
        <span className="text-slate-400">Division</span>
        <select
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
          value={divisionPcode}
          onChange={(e) =>
            onChange({
              divisionPcode: e.target.value,
              districtPcode: '',
              upazilaPcode: '',
            })
          }
        >
          <option value="">Select…</option>
          {(divisions.data ?? []).map((d) => (
            <option key={d.pcode} value={d.pcode}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">District</span>
        <select
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
          value={districtPcode}
          disabled={!divisionPcode}
          onChange={(e) =>
            onChange({
              divisionPcode,
              districtPcode: e.target.value,
              upazilaPcode: '',
            })
          }
        >
          <option value="">
            {districts.isLoading ? 'Loading…' : 'Select…'}
          </option>
          {(districts.data ?? []).map((d) => (
            <option key={d.pcode} value={d.pcode}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Upazila (optional)</span>
        <select
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
          value={upazilaPcode}
          disabled={!districtPcode}
          onChange={(e) =>
            onChange({
              divisionPcode,
              districtPcode,
              upazilaPcode: e.target.value,
            })
          }
        >
          <option value="">—</option>
          {(upazilas.data ?? []).map((d) => (
            <option key={d.pcode} value={d.pcode}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
