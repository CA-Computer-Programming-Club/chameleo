import showAlert from "@/components/alert";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useCallback, useLayoutEffect, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedModal } from "@/components/themed-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedTextInput } from "@/components/themed-text-input";
import { ThemedView } from "@/components/themed-view";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authFetch } from "@/utils/authFetch";
import { MenuView } from "@react-native-menu/menu";

import * as ImagePicker from "expo-image-picker";

import { SERVER_URL } from "@/config";

interface Item {
  id: string | number;
  type: string;
  title: string;
  location: string;
  description: string;
  image_filename: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  is_resolved?: boolean;
}

type Mode = "lost" | "found";

type LostFoundToggleProps = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

import { useThemeColor } from "@/hooks/use-theme-color";

export function LostFoundToggle({ mode, onChange }: LostFoundToggleProps) {
  const activeBg = useThemeColor({ light: "#13694E", dark: "#1FA37A" }, "tint");

  const inactiveBg = useThemeColor(
    { light: "#e5e7eb", dark: "#2c2c2e" },
    "background",
  );

  const activeText = useThemeColor(
    { light: "#ffffff", dark: "#ffffff" },
    "text",
  );

  const inactiveText = useThemeColor(
    { light: "#374151", dark: "#a1a1aa" },
    "text",
  );

  return (
    <View style={styles.toggleRow}>
      <Pressable
        onPress={() => onChange("lost")}
        style={[
          styles.toggleButton,
          { backgroundColor: mode === "lost" ? activeBg : inactiveBg },
          { marginRight: 8 },
        ]}
      >
        <ThemedText
          style={[
            styles.toggleText,
            { color: mode === "lost" ? activeText : inactiveText },
          ]}
        >
          Lost
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={() => onChange("found")}
        style={[
          styles.toggleButton,
          { backgroundColor: mode === "found" ? activeBg : inactiveBg },
        ]}
      >
        <ThemedText
          style={[
            styles.toggleText,
            { color: mode === "found" ? activeText : inactiveText },
          ]}
        >
          Found
        </ThemedText>
      </Pressable>
    </View>
  );
}

function SearchBar({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (t: string) => void;
}) {
  const bg = useThemeColor({ light: "#f3f4f6", dark: "#2c2c2e" }, "background");
  const border = useThemeColor(
    { light: "rgba(0,0,0,0.12)", dark: "rgba(255,255,255,0.12)" },
    "text",
  );
  const text = useThemeColor({ light: "#111827", dark: "#ffffff" }, "text");
  const placeholder = useThemeColor(
    { light: "rgba(17,24,39,0.45)", dark: "rgba(255,255,255,0.45)" },
    "text",
  );

  return (
    <View
      style={[
        styles.searchContainer,
        { backgroundColor: bg, borderColor: border },
      ]}
    >
      <IconSymbol
        name="magnifyingglass"
        size={18}
        color={placeholder}
        style={{ marginRight: 8 }}
      />

      <ThemedTextInput
        style={[styles.searchInput, { color: text }]}
        placeholder="Search lost & found"
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        placeholderTextColor={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode={Platform.OS === "ios" ? "while-editing" : "never"}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText("")}
          style={styles.searchClearHitbox}
        >
          <IconSymbol name="xmark" size={16} color={placeholder} />
        </Pressable>
      )}
    </View>
  );
}

function AndroidFloatingMenu({
  visible,
  onClose,
  onSelectLost,
  onSelectFound,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectLost: () => void;
  onSelectFound: () => void;
}) {
  const backgroundColor = useThemeColor(
    { light: "#ffffff", dark: "#2c2c2e" },
    "background",
  );
  const textColor = useThemeColor(
    { light: "#111827", dark: "#ffffff" },
    "text",
  );
  const separatorColor = useThemeColor(
    { light: "rgba(0,0,0,0.1)", dark: "rgba(255,255,255,0.1)" },
    "text",
  );
  const lostColor = useThemeColor(
    { light: "#c0392b", dark: "#e94f3f" },
    "text",
  );
  const foundColor = useThemeColor(
    { light: "#27ae60", dark: "#27ae60" },
    "text",
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
            alignItems: "flex-end",
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View
          style={[
            styles.androidMenu,
            {
              backgroundColor,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 16,
            },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.androidMenuItem}
            onPress={() => {
              onSelectLost();
              onClose();
            }}
          >
            <View style={styles.menuItemContent}>
              <View
                style={[
                  styles.menuIconContainer,
                  { backgroundColor: `${lostColor}15` },
                ]}
              >
                <IconSymbol
                  name="magnifyingglass"
                  size={18}
                  color={lostColor}
                />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={[styles.menuTitle, { color: textColor }]}>
                  Lost Item
                </ThemedText>
                <ThemedText
                  style={[
                    styles.menuDescription,
                    { color: textColor, opacity: 0.6 },
                  ]}
                >
                  Report something you lost
                </ThemedText>
              </View>
            </View>
          </Pressable>

          <View
            style={[styles.menuSeparator, { backgroundColor: separatorColor }]}
          />

          <Pressable
            style={styles.androidMenuItem}
            onPress={() => {
              onSelectFound();
              onClose();
            }}
          >
            <View style={styles.menuItemContent}>
              <View
                style={[
                  styles.menuIconContainer,
                  { backgroundColor: `${foundColor}15` },
                ]}
              >
                <IconSymbol name="shippingbox" size={18} color={foundColor} />
              </View>
              <View style={styles.menuTextContainer}>
                <ThemedText style={[styles.menuTitle, { color: textColor }]}>
                  Found Item
                </ThemedText>
                <ThemedText
                  style={[
                    styles.menuDescription,
                    { color: textColor, opacity: 0.6 },
                  ]}
                >
                  Report something you found
                </ThemedText>
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const IOSAddMenu = ({
  onSelectLost,
  onSelectFound,
}: {
  onSelectLost: () => void;
  onSelectFound: () => void;
}) => {
  return (
    <MenuView
      /* title="Report an item" */
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === "lost") onSelectLost();
        if (nativeEvent.event === "found") onSelectFound();
      }}
      actions={[
        {
          id: "lost",
          title: "Lost Item",
          subtitle: "Report something you lost",
          image: Platform.select({
            ios: "magnifyingglass",
          }),
          imageColor: "#c0392b",
        },
        {
          id: "found",
          title: "Found Item",
          subtitle: "Report something you found",
          image: Platform.select({
            ios: "shippingbox",
          }),
          imageColor: "#27ae60",
        },
      ]}
      shouldOpenOnLongPress={false} // Open immediately on press
    >
      <Pressable style={styles.headerPlus}>
        <ThemedText style={styles.headerPlusText}>+</ThemedText>
      </Pressable>
    </MenuView>
  );
};

const IOSImagePickerOptions = ({
  onTakePhoto,
  onChooseLibrary,
  onChooseFile,
  children,
}: {
  onTakePhoto: () => void;
  onChooseLibrary: () => void;
  onChooseFile: () => void;
  children: React.ReactNode;
}) => {
  return (
    <MenuView
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === "take_photo") onTakePhoto();
        if (nativeEvent.event === "photo_library") onChooseLibrary();
        if (nativeEvent.event === "choose_file") onChooseFile();
      }}
      actions={[
        {
          id: "choose_file",
          title: "Choose File",
          image: Platform.select({ ios: "folder" }),
          imageColor: "#000",
        },
        {
          id: "take_photo",
          title: "Take Photo",
          image: Platform.select({ ios: "camera" }),
          imageColor: "#000",
        },
        {
          id: "photo_library",
          title: "Photo Library",
          image: Platform.select({ ios: "photo.on.rectangle" }),
          imageColor: "#000",
        },
      ]}
      shouldOpenOnLongPress={false}
    >
      {children}
    </MenuView>
  );
};

const PlusButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <Pressable style={styles.circularButton} onPress={onPress}>
      <ThemedText style={styles.plusSign}>+</ThemedText>
    </Pressable>
  );
};

export default function TabTwoScreen() {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"lost" | "found">("lost");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<Mode>("lost");
  const [searchQuery, setSearchQuery] = useState("");
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, []),
  );

  const navigation = useNavigation();

  useLayoutEffect(() => {
    if (Platform.OS === "ios") {
      navigation.setOptions({
        headerSearchBarOptions: {
          placeholder: "Search lost & found",
          onChangeText: (event: { nativeEvent: { text: string } }) =>
            setSearchQuery(event.nativeEvent.text),
        },
        headerRight: () => (
          <IOSAddMenu
            onSelectLost={() => openAddModal("lost")}
            onSelectFound={() => openAddModal("found")}
          />
        ),
      });
    }
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    console.log("Refreshed items");
    setRefreshing(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/get_all_items`);
      const data = await response.json();
      const unresolvedItems = data.filter((item: Item) => !item.is_resolved);
      setItems(unresolvedItems);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const pickImage = async () => {
    try {
      // Web implementation
      if (Platform.OS === "web") {
        return new Promise((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";

          input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
              const imageUrl = URL.createObjectURL(file);
              setSelectedImage(imageUrl);
              // Store the file for upload
              setSelectedImageFile(file);
            }
          };

          input.click();
        });
      }

      // Mobile implementation
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permission Denied", "Camera roll permissions are required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showAlert("Error", "Failed to pick image");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showAlert("Sorry, we need camera permissions to make this work!");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      showAlert("Error", "Failed to take photo");
    }
  };

  const chooseFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      // Preview
      setSelectedImage(asset.uri);

      // Web needs a real File object
      if (Platform.OS === "web" && asset.file) {
        setSelectedImageFile(asset.file);
      }
    } catch (err) {
      console.error("Error choosing file:", err);
      showAlert("Error", "Failed to choose file");
    }
  };

  const showImagePickerOptions = () => {
    if (Platform.OS === "web") {
      pickImage();
    } else if (Platform.OS === "ios") {
      // Nothing, since iOS already uses IOSImagePickerOptions (MenuView)
    } else {
      // Android (and other non-web, non-iOS)
      setImagePickerVisible(true);
    }
  };

  const openAddModal = (type: "lost" | "found") => {
    setModalType(type);
    setFormData({ title: "", description: "", location: "" });
    setSelectedImage(null);
    setModalVisible(true);
  };

  const submitItem = async () => {
    if (isSubmitting) return;

    if (!formData.title || !formData.description || !formData.location) {
      showAlert("Error", "Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setModalVisible(false);
    await new Promise(requestAnimationFrame);

    try {
      const sessionToken = await AsyncStorage.getItem("session_token");
      if (!sessionToken) {
        showAlert("Error", "You must be signed in to add an item.");
        setIsSubmitting(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("location", formData.location);

      if (Platform.OS === "web" && selectedImageFile) {
        formDataToSend.append("image", selectedImageFile);
      } else if (selectedImage) {
        const filename = selectedImage.split("/").pop() || "photo.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1]}` : "image/jpeg";

        formDataToSend.append("image", {
          uri: selectedImage,
          name: filename,
          type: mimeType,
        } as any);
      }

      const endpoint =
        modalType === "lost" ? "/add_lost_item" : "/add_found_item";

      const res = await authFetch(endpoint, {
        method: "POST",
        body: formDataToSend,
      });

      if (!res) {
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const backendMessage = body?.detail || "Failed to add item";
        showAlert("Error", backendMessage);
        return;
      }

      const addedItem = await res.json();
      setItems((prev) => [addedItem, ...prev]);

      showAlert(
        "Success",
        `Added ${modalType === "lost" ? "lost" : "found"} item!`,
      );
    } catch (err: any) {
      console.error("Error adding item:", err);
      showAlert("Error", err.message || "Failed to add item");
    } finally {
      setIsSubmitting(false);
      setFormData({ title: "", description: "", location: "" });
      setSelectedImage(null);
    }
  };

  const handleMenuTrigger = () => {
    setShowMenu(true);
  };

  const renderPost = (item: Item) => (
    <ThemedView
      key={item.id}
      style={styles.postContainer}
      lightColor="#fff"
      darkColor="#2c2c2e"
    >
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/lostandfound/postdetail",
            params: { post: item.id },
          })
        }
      >
        <ThemedText style={styles.postTitle}>{item.title}</ThemedText>
        <ThemedText
          style={styles.postType}
          lightColor={item.type === "lost" ? "#c0392b" : "#27ae60"}
          darkColor={item.type === "lost" ? "#e94f3f" : "#27ae60"}
        >
          {item.type.toUpperCase()}
        </ThemedText>
        <ThemedText
          style={styles.postLocation}
          lightColor="#555"
          darkColor="#aaa"
        >
          {item.type === "lost"
            ? "Last Seen: 📍 " + item.location
            : "📍 " + item.location}
        </ThemedText>
        <ThemedText
          style={styles.postDescription}
          lightColor="#333"
          darkColor="#ddd"
        >
          {item.description.length > 150
            ? item.description.slice(0, 150) + "..."
            : item.description}
        </ThemedText>
        {item.image_filename && (
          <Image
            source={{ uri: `${SERVER_URL}/uploads/${item.image_filename}` }}
            style={styles.image}
          />
        )}
      </Pressable>
    </ThemedView>
  );

  // TODO filter server-side if needed
  const filteredItems = items.filter((item) => {
    if (item.type !== mode) return false;

    const q = searchQuery.toLowerCase();

    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q)
    );
  });

  return (
    <View style={{ flex: 1 }}>
      <ParallaxScrollView
        contentInsetAdjustmentBehavior="automatic"
        headerBackgroundColor={{ light: "#13694E", dark: "#13694E" }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        headerImage={
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              source={require("@/assets/images/chameleons.png")}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
            />
          </View>
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {/* <ThemedView style={styles.titleContainer}> */}
        {/*   <ThemedText type="title">Lost and Found</ThemedText> */}
        {/* </ThemedView> */}

        {Platform.OS !== "ios" && (
          <View style={{ paddingHorizontal: 4, marginTop: 8 }}>
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        )}

        <View style={{ paddingHorizontal: 4 }}>
          <LostFoundToggle mode={mode} onChange={setMode} />
        </View>

        <ScrollView contentContainerStyle={styles.postsWrapper}>
          {items.length === 0 ? (
            <ThemedText
              style={{
                textAlign: "center",
                marginTop: 40,
                opacity: 0.6,
                fontSize: 16,
              }}
            >
              No items found
            </ThemedText>
          ) : (
            filteredItems.map((item) => renderPost(item))
          )}
        </ScrollView>
      </ParallaxScrollView>

      <ThemedModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={`Add ${modalType === "lost" ? "Lost" : "Found"} Item`}
        lightBackgroundColor={{
          modal: "#ffffff",
          overlay: "rgba(0,0,0,0.4)",
        }}
        darkBackgroundColor={{
          modal: "#2c2c2e",
          overlay: "rgba(0,0,0,0.6)",
        }}
      >
        <ThemedTextInput
          style={styles.input}
          placeholder="Title"
          value={formData.title}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, title: text }))
          }
          returnKeyType="done"
          lightColor="#000000"
          darkColor="#FFFFFF"
          placeholderLightColor="#666666"
          placeholderDarkColor="#AAAAAA"
        />
        <ThemedTextInput
          style={styles.multilineInput}
          placeholder="Description"
          value={formData.description}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, description: text }))
          }
          multiline
          lightColor="#000000"
          darkColor="#FFFFFF"
          placeholderLightColor="#666666"
          placeholderDarkColor="#AAAAAA"
        />
        <ThemedTextInput
          style={styles.input}
          placeholder="Location"
          value={formData.location}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, location: text }))
          }
          returnKeyType="done"
          lightColor="#000000"
          darkColor="#FFFFFF"
          placeholderLightColor="#666666"
          placeholderDarkColor="#AAAAAA"
        />

        {/* Image Selection */}
        <View style={styles.imageSection}>
          <ThemedText style={styles.imageLabel}>Image (Optional)</ThemedText>

          {selectedImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.imagePreview}
              />

              {Platform.OS === "ios" ? (
                <IOSImagePickerOptions
                  onTakePhoto={takePhoto}
                  onChooseLibrary={pickImage}
                  onChooseFile={chooseFile}
                >
                  <Pressable style={styles.changeImageButton}>
                    <ThemedText style={styles.changeImageText}>
                      Change Image
                    </ThemedText>
                  </Pressable>
                </IOSImagePickerOptions>
              ) : (
                <Pressable
                  style={styles.changeImageButton}
                  onPress={showImagePickerOptions}
                >
                  <ThemedText style={styles.changeImageText}>
                    Change Image
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {Platform.OS === "ios" ? (
                <IOSImagePickerOptions
                  onTakePhoto={takePhoto}
                  onChooseLibrary={pickImage}
                  onChooseFile={chooseFile}
                >
                  <Pressable style={styles.addImageButton}>
                    <ThemedText style={styles.addImageText}>
                      + Add Image
                    </ThemedText>
                  </Pressable>
                </IOSImagePickerOptions>
              ) : (
                <Pressable
                  style={styles.addImageButton}
                  onPress={showImagePickerOptions}
                >
                  <ThemedText style={styles.addImageText}>
                    + Add Image
                  </ThemedText>
                </Pressable>
              )}
            </>
          )}
        </View>

        <View style={styles.modalButtons}>
          <Pressable
            style={[styles.button, styles.cancelButton]}
            onPress={() => setModalVisible(false)}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.button, styles.submitButton]}
            onPress={submitItem}
            disabled={isSubmitting}
          >
            <ThemedText style={styles.submitButtonText}>Add Item</ThemedText>
          </Pressable>
        </View>
      </ThemedModal>

      {Platform.OS !== "ios" && (
        <Modal
          visible={imagePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImagePickerVisible(false)}
        >
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "flex-end",
                alignItems: "stretch",
              },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setImagePickerVisible(false)}
            />

            <View
              style={{
                backgroundColor: useThemeColor(
                  { light: "#ffffff", dark: "#2c2c2e" },
                  "background",
                ),
                paddingBottom: 20,
                paddingTop: 8,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <ThemedText
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  textAlign: "center",
                  marginVertical: 8,
                }}
              >
                Select Image
              </ThemedText>

              <Pressable
                style={{ paddingVertical: 8, paddingHorizontal: 20 }}
                onPress={() => {
                  chooseFile();
                  setImagePickerVisible(false);
                }}
              >
                <ThemedText style={{ fontSize: 15 }}>Choose File</ThemedText>
              </Pressable>

              <Pressable
                style={{ paddingVertical: 8, paddingHorizontal: 20 }}
                onPress={() => {
                  takePhoto();
                  setImagePickerVisible(false);
                }}
              >
                <ThemedText style={{ fontSize: 15 }}>Take Photo</ThemedText>
              </Pressable>

              <Pressable
                style={{ paddingVertical: 8, paddingHorizontal: 20 }}
                onPress={() => {
                  pickImage();
                  setImagePickerVisible(false);
                }}
              >
                <ThemedText style={{ fontSize: 15 }}>Photo Library</ThemedText>
              </Pressable>

              <Pressable
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 20,
                  marginBottom: 8,
                }}
                onPress={() => setImagePickerVisible(false)}
              >
                <ThemedText
                  style={{
                    fontSize: 15,
                    color: useThemeColor(
                      { light: "#FF3B30", dark: "#FF453A" },
                      "text",
                    ),
                  }}
                >
                  Cancel
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS !== "ios" && (
        <>
          <View style={styles.floatingButtonContainer}>
            <PlusButton onPress={handleMenuTrigger} />
          </View>
          <AndroidFloatingMenu
            visible={showMenu}
            onClose={() => setShowMenu(false)}
            onSelectLost={() => openAddModal("lost")}
            onSelectFound={() => openAddModal("found")}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: { flexDirection: "row", gap: 8 },
  floatingButtonContainer: { position: "absolute", bottom: 20, right: 20 },
  circularButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 0,
    backgroundColor: "purple",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    overflow: "hidden",
  },
  plusSign: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 24,
    textAlign: "center",
  },
  postsWrapper: { paddingTop: 20, paddingBottom: 20, paddingHorizontal: 4 },
  postContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    elevation: 3,
  },
  postTitle: { fontSize: 18, fontWeight: "bold" },
  postType: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  postLocation: { fontSize: 13, marginTop: 4 },
  postDescription: { fontSize: 13, marginTop: 6 },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    width: "80%",
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    textAlign: "left",
    textAlignVertical: "center",
    lineHeight: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 12,
  },
  multilineInput: {
    height: 80,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  imageSection: {
    marginTop: 15,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  imagePreviewContainer: {
    alignItems: "center",
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#ccc",
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: "#ccc",
  },
  addImageButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
  },
  addImageText: {
    color: "#666",
  },
  changeImageButton: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 6,
  },
  changeImageText: {
    color: "#333",
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  submitButton: {
    backgroundColor: "#13694E",
  },
  cancelButton: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#c8c7cc",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#13694E",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 0,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
    borderWidth: 0,
    backgroundColor: "transparent",
    ...(Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        boxShadow: "none",
        borderColor: "transparent",
      },
      default: {},
    }) as any),
  },
  searchClearHitbox: {
    paddingLeft: 8,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  headerPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "purple",

    alignItems: "center",
    justifyContent: "center",
  },
  headerPlusText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 22,
  },
  androidMenu: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 260,
    borderRadius: 12,
    zIndex: 999,
  },
  androidMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  menuDescription: {
    fontSize: 13,
  },
  menuSeparator: {
    height: 1,
    marginHorizontal: 16,
  },
});
