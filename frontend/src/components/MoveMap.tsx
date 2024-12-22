import { useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import React, { useEffect } from 'react';

// マップを動かすカスタムフック
const MoveMap: React.FC<{ position?: LatLngExpression }> = ({ position }) => {
  console.log(new Date().toLocaleString(), 'MoveMap', position);

  const map = useMap();
  useEffect(() => {
    console.log(new Date().toLocaleString(), 'MoveMap.useEffect', position);
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);

  return null;
};

export default MoveMap;