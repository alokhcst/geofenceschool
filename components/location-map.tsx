import GeofencingService from '@/services/geofencing.service';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Conditionally import react-native-maps only for native platforms
let MapView: any = null;
let Circle: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Circle = Maps.Circle;
    Marker = Maps.Marker;
  } catch (error) {
    console.warn('react-native-maps not available:', error);
  }
}

interface LocationMapProps {
  schoolLatitude: number;
  schoolLongitude: number;
  geofenceRadius?: number; // in meters, default 100
  height?: number;
}

export default function LocationMap({
  schoolLatitude,
  schoolLongitude,
  geofenceRadius = 100,
  height = 300,
}: LocationMapProps) {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  const mapRef = useRef<any>(null);
  const webMapRef = useRef<HTMLDivElement | null>(null);

  // Calculate region to show both school and user location
  const getRegion = () => {
    if (userLocation) {
      // Calculate bounds to include both school and user location
      const minLat = Math.min(schoolLatitude, userLocation.latitude);
      const maxLat = Math.max(schoolLatitude, userLocation.latitude);
      const minLng = Math.min(schoolLongitude, userLocation.longitude);
      const maxLng = Math.max(schoolLongitude, userLocation.longitude);

      const latDelta = (maxLat - minLat) * 1.5 + 0.01; // Add padding
      const lngDelta = (maxLng - minLng) * 1.5 + 0.01;

      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitudeDelta: Math.max(lngDelta, 0.01),
      };
    }

    // Default to school location with appropriate zoom
    return {
      latitude: schoolLatitude,
      longitude: schoolLongitude,
      latitudeDelta: 0.005, // Zoomed in to show ~500m radius
      longitudeDelta: 0.005,
    };
  };

  const updateUserLocation = async () => {
    try {
      const location = await GeofencingService.getCurrentLocation();
      if (location) {
        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(newLocation);
        
        // Update map region to show both school and user location
        // Calculate region using new location directly to avoid state timing issues
        if (mapRef.current) {
          const minLat = Math.min(schoolLatitude, newLocation.latitude);
          const maxLat = Math.max(schoolLatitude, newLocation.latitude);
          const minLng = Math.min(schoolLongitude, newLocation.longitude);
          const maxLng = Math.max(schoolLongitude, newLocation.longitude);

          const latDelta = (maxLat - minLat) * 1.5 + 0.01;
          const lngDelta = (maxLng - minLng) * 1.5 + 0.01;

          const region = {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max(latDelta, 0.01),
            longitudeDelta: Math.max(lngDelta, 0.01),
          };
          
          mapRef.current.animateToRegion(region, 1000);
        }
      }
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  };

  const requestLocationAndUpdate = async () => {
    try {
      const hasPermission = await GeofencingService.requestPermissions();
      setLocationPermission(hasPermission);
      
      if (hasPermission) {
        await updateUserLocation();
      }
    } catch (error) {
      console.error('Error requesting location:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestLocationAndUpdate();
    
    // Set up interval to update user location every 5 seconds
    const interval = setInterval(() => {
      updateUserLocation();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { height }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  // Web fallback - embed Google Maps
  if (Platform.OS === 'web') {
    const zoomLevel = geofenceRadius <= 50 ? 18 : geofenceRadius <= 100 ? 17 : geofenceRadius <= 200 ? 16 : 15;
    const mapsUrl = `https://www.google.com/maps?q=${schoolLatitude},${schoolLongitude}&z=${zoomLevel}`;
    const embedUrl = `https://maps.google.com/maps?q=${schoolLatitude},${schoolLongitude}&hl=en&z=${zoomLevel}&output=embed`;
    
    // Calculate circle radius in pixels based on zoom level and geofence radius
    // Approximate pixels per meter at different zoom levels
    // Zoom 15: ~0.0375 px/m, Zoom 16: ~0.075 px/m, Zoom 17: ~0.15 px/m, Zoom 18: ~0.3 px/m
    const getPixelsPerMeter = (zoom: number): number => {
      return 0.0375 * Math.pow(2, zoom - 15);
    };
    
    const pixelsPerMeter = getPixelsPerMeter(zoomLevel);
    const circleRadiusPx = geofenceRadius * pixelsPerMeter;
    
    const handleMapLayout = (event: any) => {
      if (Platform.OS === 'web') {
        // Get the native node from the layout event
        const target = event.nativeEvent?.target || event.target;
        if (target) {
          const domElement = target as HTMLElement;
          if (domElement && typeof domElement.innerHTML !== 'undefined') {
            // Clear and inject iframe
            domElement.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.src = embedUrl;
            iframe.width = '100%';
            iframe.height = '100%';
            iframe.style.border = '0';
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('loading', 'lazy');
            iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
            domElement.appendChild(iframe);
          }
        }
      }
    };
    
    return (
      <View style={[styles.container, styles.webContainer, { height }]}>
        {/* Embedded Google Maps iframe container */}
        <View
          ref={(el) => {
            if (el) {
              webMapRef.current = el as any;
              // Try to inject iframe immediately if element is available
              if (Platform.OS === 'web') {
                setTimeout(() => {
                  const element = el as any;
                  const domNode = element?._nativeNode || element;
                  if (domNode && typeof domNode.innerHTML !== 'undefined') {
                    domNode.innerHTML = '';
                    const iframe = document.createElement('iframe');
                    iframe.src = embedUrl;
                    iframe.width = '100%';
                    iframe.height = '100%';
                    iframe.style.border = '0';
                    iframe.setAttribute('allowfullscreen', '');
                    iframe.setAttribute('loading', 'lazy');
                    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
                    domNode.appendChild(iframe);
                  }
                }, 100);
              }
            }
          }}
          style={styles.webMapFrame}
          onLayout={handleMapLayout}
        />
        
        {/* Geofence Circle Overlay - Thick Blue Line */}
        <View
          style={[
            styles.geofenceCircleOverlay,
            {
              marginLeft: -circleRadiusPx,
              marginTop: -circleRadiusPx,
            },
          ]}
        >
          <View
            style={{
              width: circleRadiusPx * 2,
              height: circleRadiusPx * 2,
              borderRadius: circleRadiusPx,
              borderWidth: 5,
              borderColor: '#007AFF',
              backgroundColor: 'transparent',
            }}
          />
        </View>
        
        {/* School Location Marker Overlay */}
        <View
          style={[
            styles.schoolMarkerOverlay,
            {
              marginLeft: -25,
              marginTop: -25,
            },
          ]}
        >
          <View style={styles.schoolMarkerWeb}>
            <Text style={styles.schoolMarkerWebText}>🏫</Text>
          </View>
        </View>
        
        {/* Overlay with location info */}
        <View style={styles.webMapOverlay}>
          <View style={styles.webMapInfo}>
            <Text style={styles.webMapTitle}>📍 School Location</Text>
            <Text style={styles.webMapCoordinates}>
              {schoolLatitude.toFixed(6)}, {schoolLongitude.toFixed(6)}
            </Text>
            <Text style={styles.webMapRadius}>Geofence: {geofenceRadius}m radius</Text>
            
            {userLocation && (
              <View style={styles.webUserLocation}>
                <Text style={styles.webMapTitle}>📍 Your Location</Text>
                <Text style={styles.webMapCoordinates}>
                  {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.webMapButton}
              onPress={() => Linking.openURL(mapsUrl)}
            >
              <Text style={styles.webMapLink}>Open in Google Maps →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Native platforms - use react-native-maps
  if (!MapView) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.loadingText}>Map not available on this platform</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getRegion()}
        showsUserLocation={locationPermission}
        showsMyLocationButton={true}
        followsUserLocation={false}
        mapType="standard"
        onMapReady={() => {
          // Ensure map is centered properly when ready
          const region = getRegion();
          mapRef.current?.animateToRegion(region, 500);
        }}
      >
        {/* School Location Marker */}
        <Marker
          coordinate={{
            latitude: schoolLatitude,
            longitude: schoolLongitude,
          }}
          title="School Location"
          description="School pickup area"
          pinColor="#007AFF"
        >
          <View style={styles.schoolMarker}>
            <Text style={styles.schoolMarkerText}>🏫</Text>
          </View>
        </Marker>

        {/* Geofence Circle - Thick Blue Line (Transparent Fill) */}
        <Circle
          center={{
            latitude: schoolLatitude,
            longitude: schoolLongitude,
          }}
          radius={geofenceRadius}
          strokeWidth={5}
          strokeColor="#007AFF"
          fillColor="transparent"
        />

        {/* User Location Marker (if available) */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Your Location"
            description="Current position"
            pinColor="#4CAF50"
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerDot} />
            </View>
          </Marker>
        )}
      </MapView>
      
      {!locationPermission && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Location permission needed to show your position
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  schoolMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  schoolMarkerText: {
    fontSize: 24,
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    alignSelf: 'center',
    marginTop: 2,
  },
  permissionBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    padding: 10,
    alignItems: 'center',
  },
  permissionText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '500',
  },
  webContainer: {
    backgroundColor: '#f0f0f0',
    position: 'relative',
    overflow: 'hidden',
  },
  webMapFrame: {
    width: '100%',
    height: '100%',
  },
  webMapOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    maxWidth: 250,
    zIndex: 1000,
  },
  webMapInfo: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'flex-start',
  },
  webMapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  webMapCoordinates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  webMapRadius: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  webUserLocation: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    width: '100%',
    alignItems: 'center',
  },
  webMapButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  webMapLink: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  geofenceCircleOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 500,
    // @ts-ignore - pointerEvents in style for web compatibility
    pointerEvents: 'none' as any,
  },
  schoolMarkerOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 600,
    // @ts-ignore - pointerEvents in style for web compatibility
    pointerEvents: 'none' as any,
  },
  schoolMarkerWeb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  schoolMarkerWebText: {
    fontSize: 24,
  },
});
