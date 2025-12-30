"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "leaflet";

// Dynamically import MapContainer to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

// Fix for default marker icon
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

interface AddressPickerProps {
  label: string;
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  onSelectOnMap?: boolean;
}

// Component for map click events - must be inside MapContainer
const MapClickHandler = dynamic(
  () => {
    if (typeof window === "undefined") {
      return Promise.resolve(() => null);
    }
    return import("react-leaflet").then((mod) => {
      const { useMapEvents } = mod;
      return function MapClickHandlerComponent({
        onMapClick,
      }: {
        onMapClick: (lat: number, lng: number) => void;
      }) {
        useMapEvents({
          click: (e: L.LeafletMouseEvent) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          },
        });
        return null;
      };
    });
  },
  { ssr: false }
);

export function AddressPicker({
  label,
  value,
  onChange,
  placeholder = "Enter address",
  onSelectOnMap = false,
}: AddressPickerProps) {
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState(value);
  const [searching, setSearching] = useState(false);
  // Removed unused markerRef

  // Sync searchQuery with value prop
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Geocode address to coordinates (using Nominatim - free)
  const geocodeAddress = async (address: string) => {
    if (!address.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=pk`,
        {
          headers: {
            "User-Agent": "ShareWheel App", // Required by Nominatim
          },
        }
      );

      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setSelectedLocation({ lat, lng });
        onChange(result.display_name, { lat, lng });
        setSearchQuery(result.display_name);
      } else {
        // If no results, still update the input value
        onChange(address);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      // Still update the input value even if geocoding fails
      onChange(address);
    } finally {
      setSearching(false);
    }
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "User-Agent": "ShareWheel App",
          },
        }
      );

      const data = await response.json();
      if (data && data.display_name) {
        onChange(data.display_name, { lat, lng });
        setSearchQuery(data.display_name);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const handleSearch = () => {
    if (searchQuery) {
      geocodeAddress(searchQuery);
    }
  };

  const handleInputChange = (newValue: string) => {
    setSearchQuery(newValue);
    onChange(newValue);
  };

  // Default center (Karachi)
  const defaultCenter: [number, number] = [24.8607, 67.0011];

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="space-y-2">
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
          <Input
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder={placeholder}
            className="pl-10"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSearch}
          disabled={searching || !searchQuery}
          className="w-full"
        >
          {searching ? "Searching..." : "Search Address"}
        </Button>
      </div>

      {onSelectOnMap && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMap(!showMap)}
            className="w-full"
          >
            {showMap ? "Hide Map" : "Select on Map"}
          </Button>

          {showMap && typeof window !== "undefined" && (
            <div className="h-64 w-full rounded-md border overflow-hidden">
              <MapContainer
                center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : defaultCenter}
                zoom={selectedLocation ? 15 : 12}
                style={{ height: "100%", width: "100%" }}
                key={selectedLocation ? `${selectedLocation.lat}-${selectedLocation.lng}` : "default"}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {selectedLocation && (
                  <Marker
                    position={[selectedLocation.lat, selectedLocation.lng]}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target as L.Marker;
                        const position = marker.getLatLng();
                        handleMapClick(position.lat, position.lng);
                      },
                    }}
                  />
                )}
                <MapClickHandler onMapClick={handleMapClick} />
              </MapContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
