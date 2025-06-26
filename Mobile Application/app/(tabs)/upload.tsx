import React, { useState } from "react";
import { View, Text, Button, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import MapView, { Marker } from "react-native-maps";
import { Video } from 'expo-av';
import { decode } from 'base64-arraybuffer';
import supabase from "../../lib/supabase-client";
import { useUser } from "../../lib/UserContext";
import { useRefresh } from "../../lib/RefreshContext";

// Function to detect if file is a video
const isVideoFile = (uri: string): boolean => {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  return videoExtensions.some(ext => uri.toLowerCase().includes(ext));
};

export default function UploadTab() {const [image, setImage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [tag, setTag] = useState<string>("");
  const [isPrivate, setIsPrivate] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);
  const { user } = useUser();
  const { triggerRefresh } = useRefresh();
  const pickImage = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    setStatus('Gallery permissions required!');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All, // Images + Videos
    allowsEditing: false,
    quality: 1,
  });  if (!result.canceled && result.assets.length > 0) {
    setImage(result.assets[0]);
  }
};

const takePhoto = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    setStatus('Camera permissions required!');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
  });
  if (!result.canceled && result.assets.length > 0) {
    setImage(result.assets[0]);
  }
};

const takeVideo = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    setStatus('Camera permissions required!');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false,
    quality: 1,
    videoMaxDuration: 60, // 60 seconds max
  });
  if (!result.canceled && result.assets.length > 0) {
    setImage(result.assets[0]);
  }
};


  const handleUpload = async () => {
  setStatus(null);
  if (!user) {
    setStatus("You must be logged in.");
    return;
  }  if (!image) {
    setStatus("Please select an image or video.");
    return;
  }

  setUploading(true);
  try {    const fileUri = image.uri;
    const fileName = fileUri.split("/").pop() || `media.jpg`;
    let fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
    
    // If no extension found in fileName, default to jpg for images
    if (!fileName.includes(".") || fileExt === fileName.toLowerCase()) {
      fileExt = "jpg";
    }
    
    // Normalize jpeg to jpg to match web app expectations
    if (fileExt === "jpeg") {
      fileExt = "jpg";
    }
    
    // Determine content type for both images and videos
    let contentType: string;
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
    if (videoExtensions.includes(fileExt)) {
      contentType = `video/${fileExt === 'mov' ? 'quicktime' : fileExt}`;
    } else {
      contentType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;
    }
    
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    console.log("user:", user);
    console.log("fileUri:", image.uri);
    console.log("fileName:", fileName);
    console.log("fileExt:", fileExt);
    console.log("filePath:", filePath);
    console.log("contentType:", contentType);console.log("Trying base64...");
    
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(filePath, decode(base64), {
        contentType,
        upsert: false,
      });    if (uploadError) {
      setStatus("Error during upload: " + uploadError.message);
      return;
    } else {
      const { data: photoData, error: photoError } = await supabase
        .from("photos")
        .insert({
          user_id: user.id,
          file_path: filePath,
          title: `photo_${Date.now()}.${fileExt}`,
          created_at: new Date().toISOString(),
        })        .select()
        .single();
        
      console.log("Inserted photo title:", `photo_${Date.now()}.${fileExt}`);
      
      if (photoError) {
        setStatus("Photo uploaded, but metadata save error: " + photoError.message);
        return;
      }

      console.log("Photo inserted successfully:", photoData);

      const { error: visibilityError } = await supabase
        .from("photo_visibility")
        .insert({
          id: photoData.id,
          is_private: isPrivate,
        });      if (visibilityError) {
        setStatus("Photo uploaded, but privacy setting error: " + visibilityError.message);
        return;
      }

      console.log("Photo visibility set successfully:", { id: photoData.id, is_private: isPrivate });

      const { error: infoError } = await supabase
        .from("photo_info")
        .insert({
          photo_id: photoData.id,
          tags: tag || "",
          folder: "Other",
          latitude: selectedLocation?.latitude || null,
          longitude: selectedLocation?.longitude || null,
          created_at: new Date().toISOString(),
        });          console.log("Inserting photo_info:", {
        photo_id: photoData.id,
        tags: tag || "",
        folder: "Other",
        latitude: selectedLocation?.latitude || null,
        longitude: selectedLocation?.longitude || null,
      });      if (infoError) {
        setStatus("Media uploaded, but error saving tags: " + infoError.message);
        return;
      }

      // Also insert into photo_descriptions to ensure compatibility with web app queries
      const { error: descriptionError } = await supabase
        .from("photo_descriptions")
        .insert({
          photo_id: photoData.id,
          description: "", // Default empty description
          created_at: new Date().toISOString(),
        });

      console.log("Inserting photo_descriptions:", {
        photo_id: photoData.id,
        description: "",
      });      if (descriptionError) {
        setStatus("Media uploaded, but error saving description: " + descriptionError.message);
      } else {
        setStatus("Media uploaded and saved successfully!");
        triggerRefresh(); // Refresh other components
      }
      setImage(null);
      setTag("");
      setIsPrivate(true);
      setSelectedLocation(null);
      setShowMap(false);
    }
    setUploading(false);
  } catch (err: any) {
    setUploading(false);
    setStatus("An unexpected error occurred: " + (err?.message || JSON.stringify(err)));
    console.log("UNEXPECTED ERROR:", err);
  }
};  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload Photo/Video</Text>
      <View style={styles.buttonContainer}>
        <Button title="Pick from Gallery" onPress={pickImage} />
        <Button title="Take Photo" onPress={takePhoto} />
        <Button title="Record Video" onPress={takeVideo} />
      </View>      {image && (
        <>          {isVideoFile(image.uri) ? (
            <Video
              source={{ uri: image.uri }}
              style={{ width: 200, height: 200, marginVertical: 16, borderRadius: 8 }}
              useNativeControls
              shouldPlay={false}
            />
          ) : (
            <Image
              source={{ uri: image.uri }}
              style={{ width: 200, height: 200, marginVertical: 16, borderRadius: 8 }}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Add tag..."
            value={tag}
            onChangeText={setTag}
          />
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Privacy:</Text>
            <TouchableOpacity
              style={[styles.toggleButton, !isPrivate ? styles.publicButton : styles.privateButton]}
              onPress={() => setIsPrivate(!isPrivate)}
            >
              <Text style={styles.toggleText}>
                {!isPrivate ? "Public" : "Private"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.mapToggleButton}
            onPress={() => setShowMap(!showMap)}
          >
            <Text style={styles.mapToggleText}>
              {showMap ? "Hide Map" : "Select Location on Map"}
            </Text>
          </TouchableOpacity>

          {showMap && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: 52.2297,
                  longitude: 21.0122,
                  latitudeDelta: 0.1,
                  longitudeDelta: 0.1,
                }}
                onPress={(event) => {
                  const coordinate = event.nativeEvent.coordinate;
                  setSelectedLocation(coordinate);
                }}
              >
                {selectedLocation && (
                  <Marker
                    coordinate={selectedLocation}                    title="Selected Location"
                    description="Photo will be added here"
                  />
                )}
              </MapView>
              {selectedLocation && (
                <Text style={styles.locationInfo}>
                  Selected: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.uploadButtonContainer}>
            <Button title={uploading ? "Uploading..." : "Send"} onPress={handleUpload} disabled={uploading} />
          </View>
        </>
      )}
      {status && <Text style={styles.status}>{status}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },  buttonContainer: {
    flexDirection: "row",
    marginBottom: 16,
    justifyContent: "space-around",
    width: "100%",
    maxWidth: 380,
    flexWrap: "wrap",
    gap: 8,
  },
  status: { marginTop: 16, fontSize: 16, color: "#007AFF" },
  input: {
    width: 200,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    justifyContent: "center",
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  publicButton: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  privateButton: {
    backgroundColor: "#FF9800",
    borderColor: "#FF9800",
  },  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  mapToggleButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  mapToggleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  mapContainer: {
    width: 300,
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },  locationInfo: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  uploadButtonContainer: {
    marginTop: 16,
    width: 200,
  },
});