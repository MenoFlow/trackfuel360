import React from 'react';
import { divIcon } from 'leaflet';
import * as L from 'leaflet';
import ReactDOMServer from 'react-dom/server';
import { LucideIcon } from 'lucide-react';
import { GeofenceType } from '@/types';

/**
 * Génère une position aléatoire à Madagascar
 */
export function getRandomMadagascarPosition(): [number, number] {
  const lat = -18.766947 + (Math.random() - 0.5) * 10;
  const lng = 46.869107 + (Math.random() - 0.5) * 8;
  return [lat, lng];
}

/**
 * Crée une icône personnalisée pour les véhicules
 */
export function createCustomVehicleIcon(color: string) {
  return divIcon({
    html: `<div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${color}; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/**
 * Crée une icône Lucide pour Leaflet
 */
export function createLucideDivIcon(
  IconComponent: LucideIcon,
  color: string,
  size: number = 30
): L.DivIcon {
  const IconElement = IconComponent as React.ComponentType<{ size: number; color: string }>;
  return new L.DivIcon({
    html: ReactDOMServer.renderToString(
      <IconElement size={size} color={color} />
    ),
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Retourne la couleur associée à un type de geofence
 */
export function getGeofenceColor(type: GeofenceType): string {
  switch (type) {
    case 'depot': return '#22c55e';
    case 'station': return '#3b82f6';
    case 'zone_risque': return '#ef4444';
    default: return '#6b7280';
  }
}

/**
 * Calcule la position du marker de rayon (vers le nord)
 */
export function getRadiusMarkerPosition(
  center: [number, number],
  radius: number
): [number, number] {
  const lat = center[0];
  const lon = center[1];
  const earthRadius = 6378137; // mètres
  const dLat = (radius / earthRadius) * (180 / Math.PI);
  return [lat + dLat, lon];
}

/**
 * Calcule la distance en mètres entre deux coordonnées
 */
export function calculateDistanceMeters(
  a: [number, number],
  b: [number, number]
): number {
  const R = 6371000; // rayon de la Terre en mètres
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const aVal =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}
