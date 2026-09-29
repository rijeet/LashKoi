import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { IncidentFeatureProperties } from '@/types/api';

type MapSelectionContextValue = {
  selected: IncidentFeatureProperties | null;
  select: (incident: IncidentFeatureProperties | null) => void;
};

const MapSelectionContext = createContext<MapSelectionContextValue | null>(null);

export function MapSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<IncidentFeatureProperties | null>(null);
  const select = useCallback((incident: IncidentFeatureProperties | null) => {
    setSelected(incident);
  }, []);
  const value = useMemo(() => ({ selected, select }), [selected, select]);
  return (
    <MapSelectionContext.Provider value={value}>{children}</MapSelectionContext.Provider>
  );
}

export function useMapSelection() {
  const ctx = useContext(MapSelectionContext);
  if (!ctx) throw new Error('useMapSelection outside provider');
  return ctx;
}
