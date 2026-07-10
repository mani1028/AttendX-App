import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';

import AppButton from '../../components/common/AppButton';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { launchCameraWithPermission as launchCamera } from '../../utils/cameraUtils';
import { skinDiseaseStyles as styles } from '../../components/teacher/skinDisease/skinDiseaseStyles';



// Types
interface PredictionResult {
  disease: string;
  confidence: number;
  description?: string;
  precautions?: string[];
}

export default function SkinDiseaseScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');

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
  const handleScroll = useScrollTabBar();


  // Load user context and cached result on mount
  useEffect(() => {
    const init = async () => {
      try {
        const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || '';
        const employeeId = await storage.getString(StorageKeys.EMPLOYEE_ID) || '';
        const id = `${schoolCode}_${employeeId}`;
        if (!isMounted.current) {return;}
        setUserId(id);

        const cachedResult = await AsyncStorage.getItem(`last_skin_prediction_${id}`);
        const cachedImage = await AsyncStorage.getItem(`last_skin_image_${id}`);
        if (!isMounted.current) {return;}
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

  const getFileName = (uri: string) => {
    const parts = uri.split('/').filter(Boolean);
    const rawName = parts.length ? parts[parts.length - 1] : '';
    if (!rawName) {return `skin_image_${Date.now()}.jpg`;}
    return rawName.includes('.') ? rawName : `${rawName}.jpg`;
  };

  const getMimeType = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.png')) {return 'image/png';}
    if (lower.endsWith('.webp')) {return 'image/webp';}
    if (lower.endsWith('.gif')) {return 'image/gif';}
    return 'image/jpeg';
  };

  const handleUpload = useCallback(async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    setLoading(true);
    setPrediction(null);

    try {
      const filename = getFileName(selectedImage);
      const fileType = getMimeType(filename);
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage,
        type: fileType,
        name: filename,
      } as any);

      const response = await API.post('/vitalscan/predict/skin', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Backend Response:', response.data);

      if (!isMounted.current) {return;}

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
      if (!isMounted.current) {return;}
      if (error?.response?.status === 401) {return;}
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
    if (confidence >= 0.8) {return Theme.colors.success;}
    if (confidence >= 0.6) {return Theme.colors.warning;}
    return Theme.colors.error;
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) {return 'High Confidence';}
    if (confidence >= 0.6) {return 'Medium Confidence';}
    return 'Low Confidence';
  };

  return (
    <View style={styles.container}>


      <ScrollView
       style={[styles.mainContent, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, styles.contentContainer]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
      <StandardPageHeader
        title="Skin Analysis"
        subtitle="AI-powered detection of dermatological conditions"
        onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard' as never))}
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
      />
      <View style={innerPageLayoutStyles.scrollBody}>

      {/* Image Selection Card */}
      <AppCard style={styles.card}>
        <TouchableOpacity accessibilityRole="button" style={styles.imageSelector} onPress={showImageOptions}>
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
          <ScreenSkeleton variant="list" />
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
      </View>
    </ScrollView>
    </View>
  );
}
