import { useEffect, useRef } from 'react';
import Feature from 'ol/Feature.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Point from 'ol/geom/Point.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import { fromLonLat } from 'ol/proj.js';
import OSM from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style.js';
import 'ol/ol.css';

// Leipzig
const DEFAULT_CENTER = [12.3731, 51.3397];
const DEFAULT_ZOOM = 13;

function markerStyle(feature) {
  return new Style({
    image: new Circle({
      radius: 7,
      fill: new Fill({ color: '#1d4ed8' }),
      stroke: new Stroke({ color: '#fff', width: 2 }),
    }),
    text: new Text({
      text: feature.get('name'),
      offsetY: -16,
      font: '600 12px system-ui, sans-serif',
      fill: new Fill({ color: '#111827' }),
      stroke: new Stroke({ color: '#fff', width: 3 }),
    }),
  });
}

export function RobotMap({ robots }) {
  const containerRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    const source = new VectorSource();
    sourceRef.current = source;

    const map = new Map({
      target: containerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source, style: markerStyle }),
      ],
      view: new View({
        center: fromLonLat(DEFAULT_CENTER),
        zoom: DEFAULT_ZOOM,
      }),
    });

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    const source = sourceRef.current;

    for (const robot of robots) {
      const coordinates = fromLonLat([robot.lon, robot.lat]);
      const feature = source.getFeatureById(robot.id);

      if (feature) {
        feature.getGeometry().setCoordinates(coordinates);
      } else {
        const created = new Feature({
          geometry: new Point(coordinates),
          name: robot.name,
        });
        created.setId(robot.id);
        source.addFeature(created);
      }
    }
  }, [robots]);

  return <div ref={containerRef} className="map" />;
}
