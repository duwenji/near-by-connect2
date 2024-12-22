import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from '@mui/material';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { CurrentLocationContext } from '../Contexts';
import { useContext, useEffect, useRef } from 'react';
import { FC } from 'react';
import 'leaflet/dist/leaflet.css';

interface MapDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
}

const MapPositionPickerDialog: FC<MapDialogProps> = ({ open, onClose, onSelect }) => {
  const currentPosition = useContext(CurrentLocationContext);
  const currentPositionRef = useRef<LatLngExpression>([0, 0]);

  useEffect(() => {
    console.log(new Date().toLocaleString(), 'useEffect', currentPosition);

    currentPositionRef.current =
      [
        currentPosition?.latitude ? currentPosition?.latitude : 35.681236,
        currentPosition?.longitude ? currentPosition?.longitude : 139.767125
      ];
  }, [currentPosition]);

  const handleMapClick = (e: { latlng: { lat: any; lng: any; }; }) => {
    const { lat, lng } = e.latlng;
    onSelect(lat, lng);
  };

  const MapEventComponent = () => {
    useMapEvents({
      click: (e) => {
        console.log('map click:', e.latlng);
        handleMapClick(e);
      },
      locationfound: (location) => {
        console.log('location found:', location)
      },
    })

    return null
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Select Location</DialogTitle>
      <DialogContent>
        <MapContainer center={[
            currentPosition?.latitude || 35.681236, 
            currentPosition?.longitude || 139.767125
          ]} zoom={13} style={{ height: '400px' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapEventComponent />
        </MapContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MapPositionPickerDialog;