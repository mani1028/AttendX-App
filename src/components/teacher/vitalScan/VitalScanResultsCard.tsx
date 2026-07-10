import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import AppCard from '../../common/AppCard';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import { ImageItem, ScanResult, ScanType } from './types';
import { vitalScanStyles as styles } from './vitalScanStyles';

const SCAN_TAGS = ['Pattern Recognition', 'Anomaly Detection', 'Generating Report'] as const;

interface VitalScanResultsCardProps {
  loading: boolean;
  result: ScanResult | null;
  studentName: string;
  checkupNote: string;
  scanType: ScanType;
  images: ImageItem[];
  onStartNew: () => void;
}

export default function VitalScanResultsCard({
  loading,
  result,
  studentName,
  checkupNote,
  scanType,
  images,
  onStartNew,
}: VitalScanResultsCardProps) {
  const isGood = result?.health_status === 'Good';

  return (
    <AppCard style={styles.resultsCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderIcon}>📊</Text>
        <Text style={styles.cardHeaderTitle}>Diagnostic Results</Text>
        {result && (
          <View style={[styles.resultBadge, isGood ? styles.resultBadgeGood : styles.resultBadgeBad]}>
            <Text style={[styles.resultBadgeText, isGood ? styles.resultBadgeTextGood : styles.resultBadgeTextBad]}>
              {isGood ? '✅ HEALTHY' : '⚠️ CONCERN'}
            </Text>
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.scanningContainer}>
          <View style={styles.scanBox}>
            <View style={styles.scanLine} />
            {images.length > 0 && (
              <Image source={{ uri: images[images.length - 1].uri }} style={styles.scanImage} />
            )}
          </View>
          <ScreenSkeleton variant="list" />
          <Text style={styles.scanningText}>AI ANALYZING DATA</Text>
          <View style={styles.tagRow}>
            {SCAN_TAGS.map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {!loading && result && (
        <View style={styles.resultContainer}>
          <View style={[styles.resultTopBar, isGood ? styles.resultTopBarGood : styles.resultTopBarBad]} />
          <View style={styles.resultBody}>
            <View style={styles.patientCard}>
              <Text style={styles.patientLabel}>PATIENT</Text>
              <Text style={styles.patientName}>{studentName.toUpperCase() || 'N/A'}</Text>
              {checkupNote && <Text style={styles.patientNote}>Note: {checkupNote}</Text>}
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>SCAN TYPE</Text>
                <Text style={styles.metaVal}>{scanType === 'eye' ? '👁️ Vision' : '🦷 Teeth'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>IMAGES</Text>
                <Text style={styles.metaVal}>{images.length} captured</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>STATUS</Text>
                <Text style={styles.metaVal}>{isGood ? 'Healthy' : 'Needs Attention'}</Text>
              </View>
            </View>

            <Text style={styles.findingsLabel}>🔍 AI Findings</Text>
            <Text style={styles.findingsText}>{result.prediction}</Text>

            <View style={[styles.recCard, isGood ? styles.recCardGood : styles.recCardBad]}>
              <Text style={[styles.recLabel, isGood ? styles.recLabelGood : styles.recLabelBad]}>
                📋 Recommendation
              </Text>
              <Text style={styles.recText}>{result.recommendation}</Text>
            </View>

            <TouchableOpacity accessibilityRole="button" style={styles.clearBtn} onPress={onStartNew}>
              <Text style={styles.clearBtnText}>CLOSE & START NEW SCAN</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!loading && !result && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>Awaiting Visual Data Stream</Text>
          <Text style={styles.emptyText}>
            Capture images and run diagnostics to see results here.
          </Text>
        </View>
      )}
    </AppCard>
  );
}
