import React from "react";
import { SafeAreaView } from "react-native";
import ServiceH3Map from "../components/ServiceH3Map";

export default function service() {
  return <SafeAreaView style={{ flex: 1 }}>{<ServiceH3Map />}</SafeAreaView>;
}
