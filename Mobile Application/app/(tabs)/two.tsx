import { useEffect, useState } from "react";
import { StyleSheet, FlatList, Image, ActivityIndicator, View as RNView, Text as RNText, Modal, Pressable, Dimensions } from "react-native";
import { Video, ResizeMode } from "expo-av";
import supabase from "@/lib/supabase-client";
import { Text, View } from "@/components/Themed";
import { useRefresh } from "@/lib/RefreshContext";

type Photo = {
  id: string;
  title: string;
  file_path: string;
  url: string;
  photo_info?: Array<{
    tags?: string;
    folder?: string;
    latitude?: number;
    longitude?: number;
  }>;
};

const isVideo = (filePath: string) => /\.(mp4|webm)$/i.test(filePath);
const isImage = (filePath: string) => /\.(jpg|jpeg|png|webp)$/i.test(filePath);

export default function TabTwoScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<Photo | null>(null);
  const { refreshTrigger } = useRefresh();

  useEffect(() => {
    const fetchPublicPhotos = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("photos")
        .select(`
          id,
          title,
          file_path,
          created_at,
          photo_info (
            tags,
            folder,
            latitude,
            longitude
          ),
          photo_visibility (
            is_private
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching photos:", error);
        setPhotos([]);
        setLoading(false);
        return;
      }

      // tylko publiczne
      const publicPhotos = (data ?? []).filter(
        (photo: any) => photo.photo_visibility?.is_private === false
      );

      // Get public URLs
      const photosWithUrls: Photo[] = await Promise.all(
        publicPhotos.map(async (photo: any) => {
          const { data: storageData } = supabase.storage.from("photos").getPublicUrl(photo.file_path);
          return {
            ...photo,
            url: storageData?.publicUrl,
          };
        })
      );

      setPhotos(photosWithUrls);
      setLoading(false);
    };

    fetchPublicPhotos();
  }, [refreshTrigger]);

  const openModal = (photo: Photo) => {
    setSelected(photo);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelected(null);
  };

  const screenWidth = Dimensions.get("window").width;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Public Gallery</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : photos.length === 0 ? (
        <RNText>No photos available.</RNText>
      ) : (
        <>
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            numColumns={1}
            renderItem={({ item }) => (
              <Pressable onPress={() => openModal(item)}>
                <RNView style={styles.card}>
                  {isImage(item.file_path) ? (
                    <Image source={{ uri: item.url }} style={styles.image} />
                  ) : isVideo(item.file_path) ? (
                    <Video
                      source={{ uri: item.url }}
                      style={styles.image}
                      useNativeControls
                      resizeMode={ResizeMode.COVER}
                      isLooping
                    />
                  ) : null}
                  <RNText style={styles.photoTitle}>{item.title}</RNText>
                  <RNText style={styles.meta}>
                    <RNText style={styles.metaLabel}>Folder:</RNText>
                    <RNText>{item.photo_info?.[0]?.folder || "none"}</RNText>
                  </RNText>
                  <RNText style={styles.metaLabel}>Tags:</RNText>
                  <RNView style={styles.tagsRow}>
                    {item.photo_info?.[0]?.tags
                      ? item.photo_info[0].tags
                          .split(",")
                          .map((tag: string, idx: number) =>
                            tag.trim() ? (
                              <RNText key={idx} style={styles.tag}>
                                {tag.trim()}
                              </RNText>
                            ) : null
                          )
                      : <RNText style={styles.meta}>none</RNText>}
                  </RNView>
                  {item.photo_info?.[0]?.latitude && item.photo_info?.[0]?.longitude && (
                    <RNText style={styles.meta}>
                      <RNText style={styles.metaLabel}>📍 Location: </RNText>
                      <RNText>{item.photo_info[0].latitude.toFixed(4)}, {item.photo_info[0].longitude.toFixed(4)}</RNText>
                    </RNText>
                  )}
                </RNView>
              </Pressable>
            )}
          />
          <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
            <RNView style={styles.modalBackground}>
              <Pressable style={styles.modalBackground} onPress={closeModal} />
              <RNView style={styles.modalContent}>
                {selected && isImage(selected.file_path) && (
                  <Image source={{ uri: selected.url }} style={[styles.modalImage, { maxWidth: screenWidth - 32 }]} />
                )}
                {selected && isVideo(selected.file_path) && (
                  <Video
                    source={{ uri: selected.url }}
                    style={[styles.modalImage, { maxWidth: screenWidth - 32 }]}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                  />
                )}
                <RNText style={styles.photoTitle}>{selected?.title}</RNText>
                <RNText style={styles.meta}>
                  <RNText style={styles.metaLabel}>Folder:</RNText>
                  <RNText>{selected?.photo_info?.[0]?.folder || "none"}</RNText>
                </RNText>
                <RNText style={styles.metaLabel}>Tags:</RNText>
                <RNView style={styles.tagsRow}>
                  {selected?.photo_info?.[0]?.tags
                    ? selected.photo_info[0].tags
                        .split(",")
                        .map((tag: string, idx: number) =>
                          tag.trim() ? (
                            <RNText key={idx} style={styles.tag}>
                              {tag.trim()}
                            </RNText>
                          ) : null
                        )
                    : <RNText style={styles.meta}>none</RNText>}
                </RNView>
                {selected?.photo_info?.[0]?.latitude && selected?.photo_info?.[0]?.longitude && (
                  <RNText style={styles.meta}>
                    <RNText style={styles.metaLabel}>📍 Location: </RNText>
                    <RNText>{selected.photo_info[0].latitude.toFixed(4)}, {selected.photo_info[0].longitude.toFixed(4)}</RNText>
                  </RNText>
                )}
              </RNView>
            </RNView>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 8 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    width: 320,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: "center",
  },
  image: { width: 280, height: 180, borderRadius: 8, marginBottom: 8, backgroundColor: "#eee" },
  photoTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 4 },
  meta: { fontSize: 13, color: "#444", marginBottom: 2 },
  metaLabel: { fontWeight: "bold", color: "#222" },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    maxWidth: 350,
    width: "90%",
  },
  modalImage: {
    width: 300,
    height: 220,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#eee",
    alignSelf: "center",
  },
  tag: { fontSize: 13, color: "#007bff", marginRight: 4 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8, alignSelf: "flex-start" },
});
