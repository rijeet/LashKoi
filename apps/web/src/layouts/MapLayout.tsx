import { Outlet, useParams } from 'react-router';
import { SplashGate } from '@/components/splash/SplashGate';
import { MapSelectionProvider } from '@/context/MapSelectionContext';
import type { Lang } from '@/types/api';

export function MapLayout() {
  const { lang: langParam } = useParams();
  const lang: Lang = langParam === 'bn' ? 'bn' : 'en';

  return (
    <MapSelectionProvider>
      <SplashGate lang={lang}>
        <div className="h-full min-h-[100dvh] w-full">
          <Outlet />
        </div>
      </SplashGate>
    </MapSelectionProvider>
  );
}
