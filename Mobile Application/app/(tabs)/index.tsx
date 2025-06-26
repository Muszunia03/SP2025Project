import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Modal } from "react-native";
import { Video, ResizeMode } from "expo-av";
import supabase from "../../lib/supabase-client";
import { useRefresh } from "../../lib/RefreshContext";
import { useUser } from "../../lib/UserContext";

export default function MyGalleryScreen() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { refreshTrigger, triggerRefresh } = useRefresh();
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      fetchUserPhotos(user.id);
    } else {
      setPhotos([]);
      setLoading(false);
    }
  }, [refreshTrigger, user]);

  const fetchUserPhotos = async (userId: string) => {
    setLoading(true);    const { data, error } = await supabase
      .from("photos")
      .select(`
        *,
        photo_visibility (
          is_private
        ),
        photo_info (
          tags,
          folder
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });    if (error) {
      console.error("Error fetching photos:", error.message);
    } else {
      const photosWithUrls = data.map((photo: any) => {
        const { data: storageData } = supabase.storage.from("photos").getPublicUrl(photo.file_path);
        return {
          ...photo,
          url: storageData?.publicUrl,
        };
      });
      setPhotos(photosWithUrls);
    }
    
    setLoading(false);
  };

  const deletePhoto = async (photo: any) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("photos")
        .remove([photo.file_path]);

      if (storageError) {
        Alert.alert("Error", "Failed to delete file: " + storageError.message);
        return;
      }

      // Delete from tables
      const { error: visibilityError } = await supabase
        .from("photo_visibility")
        .delete()
        .eq("id", photo.id);

      const { error: infoError } = await supabase
        .from("photo_info")
        .delete()
        .eq("photo_id", photo.id);

      const { error: photoError } = await supabase
        .from("photos")
        .delete()
        .eq("id", photo.id);

      if (photoError) {
        Alert.alert("Error", "Failed to delete from database: " + photoError.message);
        return;
      }

      // Update local list
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setShowDeleteModal(false);
      setSelectedPhoto(null);
      triggerRefresh(); // Refresh other components
      
      Alert.alert("Success", "Photo has been deleted");
    } catch (error: any) {
      Alert.alert("Error", "Unexpected error occurred: " + error.message);
    }
  };

  const togglePrivacy = async (photo: any) => {
    const newPrivacyStatus = !photo.photo_visibility?.is_private;
    
    const { error } = await supabase
      .from("photo_visibility")
      .update({ is_private: newPrivacyStatus })
      .eq("id", photo.id);

    if (error) {
      Alert.alert("Error", "Failed to change privacy status: " + error.message);
    } else {
      setPhotos(prev => prev.map(p => 
        p.id === photo.id 
          ? { ...p, photo_visibility: { is_private: newPrivacyStatus } }
          : p
      ));
      triggerRefresh(); // Refresh other components
      Alert.alert("Success", `Photo is now ${newPrivacyStatus ? 'private' : 'public'}`);
    }
  };
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Please log in from Settings to view your photos</Text>
      </View>
    );
  }
  const renderPhoto = ({ item }: { item: any }) => (
    <View style={styles.photoCard}>
      {isVideoFile(item.title) ? (
        <Video
          source={{ uri: item.url }}
          style={styles.photoImage}
          shouldPlay={false}
          isLooping={false}
          resizeMode={ResizeMode.COVER}
          useNativeControls
        />
      ) : (
        <Image source={{ uri: item.url }} style={styles.photoImage} />
      )}
      
      <View style={styles.photoInfo}>
        <Text style={styles.photoTitle}>{item.title}</Text>
        <Text style={styles.photoMeta}>
          Folder: {item.photo_info?.[0]?.folder || "Other"}
        </Text>
        <Text style={styles.photoMeta}>
          Tags: {item.photo_info?.[0]?.tags || "none"}
        </Text>
        <Text style={styles.photoMeta}>
          Status: {item.photo_visibility?.is_private ? "Private" : "Public"}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.privacyButton]}
          onPress={() => togglePrivacy(item)}
        >
          <Text style={styles.buttonText}>
            {item.photo_visibility?.is_private ? "Make Public" : "Make Private"}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {
            setSelectedPhoto(item);
            setShowDeleteModal(true);
          }}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Function to detect if file is video based on file extension
  const isVideoFile = (title: string): boolean => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    return videoExtensions.some(ext => title.toLowerCase().includes(ext));
  };

  return (    <View style={styles.container}>
      <Text style={styles.title}>My Gallery</Text>
      
      {loading ? (
        <Text>Loading...</Text>
      ) : photos.length === 0 ? (
        <Text style={styles.info}>You don't have any photos yet</Text>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          renderItem={renderPhoto}
          style={styles.photosList}
          showsVerticalScrollIndicator={false}
        />      )}

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Photo</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete "{selectedPhoto?.title}"?
            </Text>
            <Text style={styles.modalWarning}>
              This action cannot be undone!
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedPhoto(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => deletePhoto(selectedPhoto)}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff", 
    padding: 16 
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 16,
    textAlign: "center"
  },
  info: { 
    fontSize: 16, 
    marginBottom: 8,
    textAlign: "center",
    color: "#666"
  },
  photosList: {
    flex: 1,
    marginTop: 16,
  },
  photoCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photoImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoInfo: {
    marginBottom: 12,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  photoMeta: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  privacyButton: {
    backgroundColor: "#2196F3",
  },
  deleteButton: {
    backgroundColor: "#e11d48",
  },
  buttonText: {
    color: "white",    fontWeight: "600",
    textAlign: "center",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  modalWarning: {
    fontSize: 14,
    color: "#e11d48",
    marginBottom: 20,
    textAlign: "center",
    fontStyle: "italic",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: "#666",
  },
  confirmButton: {
    backgroundColor: "#e11d48",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
  },
});