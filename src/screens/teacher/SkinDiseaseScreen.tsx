import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

// Types
interface PredictionResult {
  disease: string;
  confidence: number;
  description?: string;
  precautions?: string[];
}

export default function SkinDiseaseScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');

  const lastScrollY = useRef(0);

  useEffect(() => {
    setTabBarVisible(true);
    isMounted.current = true;
    const unsubscribe = navigation.addListener('focus', () => {
      setTabBarVisible(true);
    });
    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [navigation, setTabBarVisible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  // Load user context and cached result on mount
  useEffect(() => {
    const init = async () => {
      try {
        const schoolCode = await AsyncStorage.getItem('school_code') || '';
        const employeeId = await AsyncStorage.getItem('employee_id') || '';
        const id = `${schoolCode}_${employeeId}`;
        if (!isMounted.current) return;
        setUserId(id);

        const cachedResult = await AsyncStorage.getItem(`last_skin_prediction_${id}`);
        const cachedImage = await AsyncStorage.getItem(`last_skin_image_${id}`);
        if (!isMounted.current) return;
        if (cachedResult) {
          setPrediction(JSON.parse(cachedResult));
        }
        if (cachedImage) {
          setSelectedImage(cachedImage);
        }
      } catch (e) {
        console.warn('Failed to load skin disease cache', e);
      }
    };
    init();
  }, []);

  const showImageOptions = useCallback(() => {
    Alert.alert(
      'Select Image',
      'Choose an image source',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => openCamera() },
        { text: 'Choose from Gallery', onPress: () => openGallery() },
      ],
      { cancelable: true }
    );
  }, []);

  const openCamera = useCallback(() => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.9,
        includeBase64: false,
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Camera error occurred');
        } else if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setSelectedImage(asset.uri || null);
          setPrediction(null);
        }
      }
    );
  }, []);

  const openGallery = useCallback(() => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.9,
        includeBase64: false,
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled gallery');
        } else if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Gallery error occurred');
        } else if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setSelectedImage(asset.uri || null);
          setPrediction(null);
        }
      }
    );
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    setLoading(true);
    setPrediction(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'skin_image.jpg',
      } as any);

      const response = await API.post('/vitalscan/predict/skin', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Backend Response:', response.data);

      if (!isMounted.current) return;

      if (response.data && response.data.predictions) {
        const result = response.data.predictions[0];
        const predictionData = {
          disease: result.disease || result.class_name || 'Unknown',
          confidence: result.confidence || 0,
          description: result.description,
          precautions: result.precautions,
        };
        setPrediction(predictionData);

        // Cache result and image
        if (userId) {
          await AsyncStorage.setItem(`last_skin_prediction_${userId}`, JSON.stringify(predictionData));
          if (selectedImage) {
            await AsyncStorage.setItem(`last_skin_image_${userId}`, selectedImage);
          }
        }
      } else {
        Alert.alert('No Result', 'No prediction returned from the server');
      }
    } catch (error: any) {
      if (!isMounted.current) return;
      if (error?.response?.status === 401) return;
      console.error('Upload Error:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.detail || 'Backend error. Is the model loaded?'
      );
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [selectedImage, userId]);

  const resetAnalysis = useCallback(async () => {
    setSelectedImage(null);
    setPrediction(null);
    try {
      if (userId) {
        await AsyncStorage.removeItem(`last_skin_prediction_${userId}`);
        await AsyncStorage.removeItem(`last_skin_image_${userId}`);
      }
    } catch (e) {
      console.warn('Failed to clear skin disease cache', e);
    }
  }, [userId]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Navy Hero Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard' as never)}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <AppText weight="bold" style={styles.heroTitle}>Skin Analysis</AppText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.heroContent}>
          <AppText weight="bold" style={styles.heroGreeting}>Health Check</AppText>
          <AppText style={styles.heroSubtext}>AI-powered detection of dermatological conditions</AppText>
        </View>
      </View>

      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >

      {/* Image Selection Card */}
      <AppCard style={styles.card}>
        <TouchableOpacity style={styles.imageSelector} onPress={showImageOptions}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>Tap to select image</Text>
              <Text style={styles.placeholderSubtext}>Camera or Gallery</Text>
            </View>
          )}
        </TouchableOpacity>

        {selectedImage && (
          <View style={styles.buttonRow}>
            <AppButton
              title="Change Image"
              onPress={showImageOptions}
              type="secondary"
              style={styles.changeBtn}
            />
            <AppButton
              title={loading ? 'Analyzing...' : 'Run Diagnosis'}
              onPress={handleUpload}
              disabled={loading || !selectedImage}
              style={styles.analyzeBtn}
            />
          </View>
        )}
      </AppCard>

      {/* Loading Indicator */}
      {loading && (
        <AppCard style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Analyzing Image...</Text>
          <Text style={styles.loadingSubtext}>
            Our AI model is processing your skin image
          </Text>
        </AppCard>
      )}

      {/* Prediction Result */}
      {prediction && !loading && (
        <AppCard style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultIcon}>🔬</Text>
            <Text style={styles.resultTitle}>Analysis Result</Text>
          </View>

          {/* Disease Name */}
          <View style={styles.resultSection}>
            <Text style={styles.resultLabel}>Condition</Text>
            <Text style={styles.diseaseName}>{prediction.disease}</Text>
          </View>

          {/* Confidence Score */}
          <View style={styles.resultSection}>
            <Text style={styles.resultLabel}>Confidence</Text>
            <View style={styles.confidenceContainer}>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    {
                      width: `${(prediction.confidence * 100)}%`,
                      backgroundColor: getConfidenceColor(prediction.confidence),
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.confidenceText,
                  { color: getConfidenceColor(prediction.confidence) },
                ]}
              >
                {(prediction.confidence * 100).toFixed(2)}% -{' '}
                {getConfidenceLevel(prediction.confidence)}
              </Text>
            </View>
          </View>

          {/* Description */}
          {prediction.description && (
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Description</Text>
              <Text style={styles.descriptionText}>{prediction.description}</Text>
            </View>
          )}

          {/* Precautions */}
          {prediction.precautions && prediction.precautions.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>Precautions</Text>
              {prediction.precautions.map((item, index) => (
                <View key={index} style={styles.precautionItem}>
                  <Text style={styles.precautionBullet}>•</Text>
                  <Text style={styles.precautionText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerIcon}>⚠️</Text>
            <Text style={styles.disclaimerText}>
              This is an AI-powered analysis and not a medical diagnosis. 
              Please consult a qualified dermatologist for proper medical advice.
            </Text>
          </View>

          {/* Reset Button */}
          <AppButton
            title="Analyze Another Image"
            onPress={resetAnalysis}
            type="secondary"
            style={styles.resetBtn}
          />
        </AppCard>
      )}

      {/* Info Cards */}
      <View style={styles.infoGrid}>
        <AppCard style={styles.infoCard}>
          <Text style={styles.infoIcon}>🧠</Text>
          <Text style={styles.infoTitle}>AI Powered</Text>
          <Text style={styles.infoText}>
            Using deep learning models trained on thousands of skin images
          </Text>
        </AppCard>

        <AppCard style={styles.infoCard}>
          <Text style={styles.infoIcon}>⚡</Text>
          <Text style={styles.infoTitle}>Fast Analysis</Text>
          <Text style={styles.infoText}>
            Get results within seconds with high accuracy
          </Text>
        </AppCard>

        <AppCard style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoTitle}>Private & Secure</Text>
          <Text style={styles.infoText}>
            Your images are processed securely and not stored
          </Text>
        </AppCard>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerStandard: {
    backgroundColor: '#001F3F',
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  heroContent: {
    marginTop: 20,
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    marginTop: -20,
    padding: 24,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  imageSelector: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    minHeight: 200,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  changeBtn: {
    flex: 1,
  },
  analyzeBtn: {
    flex: 2,
    backgroundColor: '#001F3F',
  },
  loadingCard: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  resultCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  resultIcon: {
    fontSize: 28,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  resultSection: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748B',
    marginBottom: 8,
  },
  diseaseName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  confidenceContainer: {
    gap: 8,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  precautionBullet: {
    fontSize: 14,
    color: '#10B981',
    marginRight: 8,
  },
  precautionText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 16,
    gap: 10,
  },
  disclaimerIcon: {
    fontSize: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  resetBtn: {
    marginTop: 8,
  },
  infoGrid: {
    gap: 12,
  },
  infoCard: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  infoIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});