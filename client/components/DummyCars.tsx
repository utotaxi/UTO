import React, { useEffect, useState, useRef } from 'react';
import { View } from 'react-native';
import { MarkerWrapper } from './MapView';
import { TopDownCarView } from './TopDownCarView';

interface Location {
  latitude: number;
  longitude: number;
}

interface DummyCar {
  id: string;
  latitude: number;
  longitude: number;
  heading: number;
  targetLatitude: number;
  targetLongitude: number;
  speed: number;
}

interface DummyCarsProps {
  location: Location;
}

// Helper to calculate distance between two coordinates in miles
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8; // Radius of earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Generates a random point within a certain radius (in miles)
const generateRandomPoint = (center: Location, radiusMiles: number) => {
  const radiusInDegrees = radiusMiles / 69; // Rough conversion, 1 degree lat is ~69 miles
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  
  // Adjust longitude based on latitude
  const newLon = x / Math.cos(center.latitude * Math.PI / 180) + center.longitude;
  const newLat = y + center.latitude;
  
  return { latitude: newLat, longitude: newLon };
};

// Generates initial dummy cars around a center point
const generateInitialCars = (center: Location, count: number): DummyCar[] => {
  const cars: DummyCar[] = [];
  for (let i = 0; i < count; i++) {
    // Start them within 1 mile
    const startPoint = generateRandomPoint(center, 1);
    // Give them a target within 1.5 miles of the center
    const targetPoint = generateRandomPoint(center, 1.5);
    
    // Calculate initial heading
    const dLon = (targetPoint.longitude - startPoint.longitude);
    const y = Math.sin(dLon) * Math.cos(targetPoint.latitude);
    const x = Math.cos(startPoint.latitude) * Math.sin(targetPoint.latitude) -
              Math.sin(startPoint.latitude) * Math.cos(targetPoint.latitude) * Math.cos(dLon);
    let brng = Math.atan2(y, x);
    brng = brng * 180 / Math.PI;
    brng = (brng + 360) % 360;

    cars.push({
      id: `dummy_car_${i}`,
      latitude: startPoint.latitude,
      longitude: startPoint.longitude,
      heading: brng,
      targetLatitude: targetPoint.latitude,
      targetLongitude: targetPoint.longitude,
      speed: 0.00005 + (Math.random() * 0.00005), // Varying speeds
    });
  }
  return cars;
};

export function DummyCars({ location }: DummyCarsProps) {
  // Use 6 items for 5-7 range
  const [cars, setCars] = useState<DummyCar[]>([]);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    // Initialize cars
    setCars(generateInitialCars(location, 6));

    // Update cars every second to simulate movement
    animationRef.current = setInterval(() => {
      setCars(prevCars => prevCars.map(car => {
        const distance = getDistance(car.latitude, car.longitude, car.targetLatitude, car.targetLongitude);
        
        // If close to target, pick a new target around the center location
        if (distance < 0.05) {
           const newTarget = generateRandomPoint(location, 1.5);
           // Recalculate heading
           const dLon = (newTarget.longitude - car.longitude) * Math.PI / 180;
           const lat1 = car.latitude * Math.PI / 180;
           const lat2 = newTarget.latitude * Math.PI / 180;
           
           const y = Math.sin(dLon) * Math.cos(lat2);
           const x = Math.cos(lat1) * Math.sin(lat2) -
                     Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
           let brng = Math.atan2(y, x);
           brng = brng * 180 / Math.PI;
           brng = (brng + 360) % 360;

           return {
             ...car,
             targetLatitude: newTarget.latitude,
             targetLongitude: newTarget.longitude,
             heading: brng
           };
        }

        // Move towards target
        const latDiff = car.targetLatitude - car.latitude;
        const lonDiff = car.targetLongitude - car.longitude;
        
        // Simple linear interpolation
        const newLat = car.latitude + (latDiff * car.speed * 20);
        const newLon = car.longitude + (lonDiff * car.speed * 20);

        return {
          ...car,
          latitude: newLat,
          longitude: newLon
        };
      }));
    }, 1000);

    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [location.latitude, location.longitude]); // Re-run if center location changes significantly

  return (
    <>
      {cars.map((car) => (
        <MarkerWrapper
          key={car.id}
          coordinate={{ latitude: car.latitude, longitude: car.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
        >
          <View style={{ transform: [{ rotate: `${car.heading}deg` }] }}>
             <TopDownCarView />
          </View>
        </MarkerWrapper>
      ))}
    </>
  );
}
