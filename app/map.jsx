import React from "react";
import { SafeAreaView } from "react-native";
import H3GridMap from "../components/H3GridMap";

const Map = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <H3GridMap />
    </SafeAreaView>
  );
};

export default Map;
