import React from "react";
import { View, Image } from "react-native";
import MapView, { Marker } from "react-native-maps";

const carIcon = require("./assets/car-icon.png"); // Path to your car icon

const MapComponent = ({ location, serviceProviders, providerLoc }) => {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={location} title="Your Location" />
        {serviceProviders.map((provider) => (
          <Marker
            key={provider.id}
            coordinate={{
              latitude: provider.latitude,
              longitude: provider.longitude,
            }}
            title={provider.name}
            description={provider.role}
            image={carIcon} // Use the car icon here
          />
        ))}
        {providerLoc.map((provider) => (
          <Marker
            key={provider.id}
            coordinate={{
              latitude: provider.latitude,
              longitude: provider.longitude,
            }}
            title={provider.name}
            description={provider.role}
            image={carIcon} // Use the car icon here
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
};

export default MapComponent;
