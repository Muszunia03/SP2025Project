import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, Image } from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import supabase from "../../lib/supabase-client";
import { useUser } from "../../lib/UserContext";
import { useRefresh } from "../../lib/RefreshContext";

export default function MapTab() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const { refreshTrigger } = useRefresh();

  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);

      const { data: photoInfoList, error: infoError } = await supabase
        .from("photo_info")
        .select("id, photo_id, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (infoError) {
        setLoading(false);
        return;
      }

      const photoIds = photoInfoList.map((info: any) => info.photo_id);

      const { data: photoList, error: photoError } = await supabase
        .from("photos")
        .select("id, file_path, title")
        .in("id", photoIds)
        .eq("user_id", user.id);

      if (photoError) {
        setLoading(false);
        return;
      }

      const mergedPhotos = photoInfoList.map((info: any) => {
        const matchingPhoto = photoList.find((photo: any) => photo.id === info.photo_id);
        if (!matchingPhoto) return null;
        const { data } = supabase.storage.from("photos").getPublicUrl(matchingPhoto.file_path);
        return {
          id: info.id,
          title: matchingPhoto.title,
          url: data?.publicUrl,
          latitude: info.latitude,
          longitude: info.longitude,
        };
      }).filter(Boolean);

      setPhotos(mergedPhotos);
      setLoading(false);
    };    fetchPhotos();
  }, [refreshTrigger]);

  const { width, height } = Dimensions.get("window");

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>Map of Photos with Location</Text>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 32 }} />
      ) : (
        <MapView
          style={{ width, height: height - 120 }}
          initialRegion={{
            latitude: 52.22977,
            longitude: 21.01178,
            latitudeDelta: 4,
            longitudeDelta: 4,
          }}
        >
          <UrlTile
            urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          {photos.map((photo) => (
            <Marker
              key={photo.id}
              coordinate={{
                latitude: photo.latitude,
                longitude: photo.longitude,
              }}
            >
              <Image
                source={{ uri: photo.url }}
                style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 2, borderColor: "#fff" }}
                resizeMode="cover"
              />
            </Marker>
          ))}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "bold", marginTop: 16, marginBottom: 8, alignSelf: "center" },
});