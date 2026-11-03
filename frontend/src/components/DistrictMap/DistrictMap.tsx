import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { BuildingFeatureProps, DistrictMapProps } from '../../types/contracts';

/**
 * MEMBER 3 WORKSPACE: `frontend/src/components/DistrictMap/`
 * Keep `DistrictMapProps` intact so `App.tsx` and Member 4's `MissionHUD` integrate with zero merge conflicts.
 */
export function DistrictMap({
  activeLayer,
  selectedYear,
  onSelectBuilding,
}: DistrictMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [55.158, 24.948],
      zoom: 13.4,
      pitch: 58,
      bearing: 135,
    });

    map.on('load', () => {
      map.addSource('dubai-south-buildings', {
        type: 'geojson',
        data: '/data/dubai_south/buildings_3d.geojson',
      });

      map.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'dubai-south-buildings',
        paint: {
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['get', 'lst_celsius'],
            38, '#06b6d4',
            44, '#f59e0b',
            49, '#ef4444',
          ],
          'fill-extrusion-height': ['get', 'height_m'],
          'fill-extrusion-opacity': 0.88,
        },
      });

      map.on('click', 'buildings-3d', (e) => {
        const feat = e.features?.[0];
        if (feat?.properties) {
          onSelectBuilding(feat.properties as unknown as BuildingFeatureProps);
        }
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onSelectBuilding]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('buildings-3d')) return;
    map.setFilter('buildings-3d', ['<=', ['get', 'growth_year'], selectedYear]);
  }, [activeLayer, selectedYear]);

  return <div ref={containerRef} className="w-full h-full" />;
}
