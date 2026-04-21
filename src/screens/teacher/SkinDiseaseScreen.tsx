import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';

// Types
interface PredictionResult {
  disease: string;
  confidence: number;
  description?: string;
  precautions?: string[];
}

export default function SkinDiseaseScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

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

      if (response.data && response.data.predictions) {
        const result = response.data.predictions[0];
        setPrediction({
          disease: result.disease || result.class_name || 'Unknown',
          confidence: result.confidence || 0,
          description: result.description,
          precautions: result.precautions,
        });
      } else {
        Alert.alert('No Result', 'No prediction returned from the server');
      }
    } catch (error: any) {
      console.error('Upload Error:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.detail || 'Backend error. Is the model loaded?'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedImage]);

  const resetAnalysis = useCallback(() => {
    setSelectedImage(null);
    setPrediction(null);
  }, []);

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔬 Skin Disease AI Analysis</Text>
        <Text style={styles.subtitle}>
          Upload a skin image for AI-powered disease detection
        </Text>
      </View>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  imageSelector: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
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
    color: '#94a3b8',
    fontWeight: '500',
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#64748b',
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
  },
  loadingCard: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  resultCard: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderColor: '#10b981',
    borderWidth: 1,
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  resultIcon: {
    fontSize: 28,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  resultSection: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: 8,
  },
  diseaseName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  confidenceContainer: {
    gap: 8,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#334155',
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
    color: '#cbd5e1',
    lineHeight: 20,
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  precautionBullet: {
    fontSize: 14,
    color: '#10b981',
    marginRight: 8,
  },
  precautionText: {
    flex: 1,
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
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
    color: '#92400e',
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
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  infoIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});