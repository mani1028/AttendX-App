/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  CheckCircle2, Clock, AlertTriangle, Users,
} from 'lucide-react-native';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import AppCard from '../../common/AppCard';
import { Theme } from '../../../theme/tokens';
import { studentPromotionStyles as styles } from './studentPromotionStyles';
import PromoPicker from './PromoPicker';
import { STEPS, STEP_LABELS, PICKER_TEXT, PICKER_MUTED } from './types';

export function createPromotionRenderers(d: any) {
  const {
    step, setStep, sourceClass, setSourceClass, sourceSection, setSourceSection,
    sourceYearId, setSourceYearId, targetYearId, setTargetYearId, batchName, setBatchName,
    uniqueClasses, sectionsForClass, academicYears, students, eligibility, loading,
    loadEligibility, resetPromoteFlow, setActiveTab, batchStatus,
    academicYearLabel, setAcademicYearLabel, historyBatches, loadingHistory, selectedBatchDetails, loadingBatchDetails,
    fetchBatchDetails, setSelectedBatchDetails, promoSettings, loadingSettings, savingSettings, getRule, updatePromoSettingField,
    savePromoSetting, newClassGrade, setNewClassGrade, academicYears: years, activateYear, closeYear,
    setShowYearModal, transitionEvents, runLeaveTransition, runFixAcademicYears,
    updateStudentAction, submitBatch, rollbackBatch,
  } = d;

  const renderStepBar = () => (
    <View style={styles.stepBarWrap}>
      <View style={styles.stepBarTrack} />
      <View style={styles.stepBar}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
                <AppText style={[styles.stepDotText, (active || done) && styles.stepDotTextActive]}>{n}</AppText>
              </View>
              <AppText style={[styles.stepLabel, (active || done) && styles.stepLabelActive]} numberOfLines={1}>
                {label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderSelectStep = () => (
    <AppCard style={styles.card}>
      <AppText style={styles.cardTitle} weight="bold">Step 1 · Define scope</AppText>
      <AppText style={styles.cardHint}>Choose class, section, and academic years to promote students.</AppText>

      <View style={styles.fieldGroup}>
        <AppText style={styles.fieldLabel}>Source class</AppText>
        <PromoPicker selectedValue={sourceClass} onValueChange={(v) => { setSourceClass(v); setSourceSection(''); }}>
          <Picker.Item label="Select class…" value="" color={PICKER_MUTED} />
          <Picker.Item label="ALL CLASSES (whole school)" value="ALL" color={PICKER_TEXT} />
          {uniqueClasses.map((c: any) => <Picker.Item key={c} label={c} value={c} color={PICKER_TEXT} />)}
        </PromoPicker>
      </View>

      <View style={styles.fieldGroup}>
        <AppText style={styles.fieldLabel}>Source section</AppText>
        {sourceClass === 'ALL' ? (
          <View style={styles.staticField}>
            <AppText style={styles.staticFieldText} weight="semibold">All sections (whole school)</AppText>
          </View>
        ) : (
          <PromoPicker
            selectedValue={sourceSection}
            onValueChange={setSourceSection}
            enabled={!!sourceClass}
          >
            <Picker.Item label="Select section…" value="" color={PICKER_MUTED} />
            {sectionsForClass.map((s: any) => <Picker.Item key={s} label={s} value={s} color={PICKER_TEXT} />)}
          </PromoPicker>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <AppText style={styles.fieldLabel}>Current academic year</AppText>
        <PromoPicker
          selectedValue={sourceYearId}
          onValueChange={(v) => {
            setSourceYearId(v);
            const yr = academicYears.find((y: any) => String(y.year_id) === String(v));
            setAcademicYearLabel(yr?.year_label || '');
          }}
        >
          <Picker.Item label="Select year…" value="" color={PICKER_MUTED} />
          {academicYears.map((y: any) => (
            <Picker.Item key={y.year_id} label={`${y.year_label} (${y.status})`} value={String(y.year_id)} color={PICKER_TEXT} />
          ))}
        </PromoPicker>
      </View>

      <View style={styles.fieldGroup}>
        <AppText style={styles.fieldLabel}>Target academic year</AppText>
        <PromoPicker selectedValue={targetYearId} onValueChange={setTargetYearId}>
          <Picker.Item label="Select target year…" value="" color={PICKER_MUTED} />
          {academicYears.map((y: any) => (
            <Picker.Item key={y.year_id} label={y.year_label} value={String(y.year_id)} color={PICKER_TEXT} />
          ))}
        </PromoPicker>
      </View>

      <AppButton title="Preview eligibility" onPress={loadEligibility} disabled={loading} />
    </AppCard>
  );

  const renderPreviewStep = () => (
    <>
      {eligibility?.summary ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <AppText style={styles.statValue} weight="bold">{eligibility.summary.total}</AppText>
            <AppText style={styles.statLabel}>Total</AppText>
          </View>
          <View style={styles.statCard}>
            <AppText style={[styles.statValue, { color: Theme.colors.success }]} weight="bold">{eligibility.summary.eligible}</AppText>
            <AppText style={styles.statLabel}>Eligible</AppText>
          </View>
          <View style={styles.statCard}>
            <AppText style={[styles.statValue, { color: Theme.colors.warning }]} weight="bold">{eligibility.summary.at_risk}</AppText>
            <AppText style={styles.statLabel}>At risk</AppText>
          </View>
        </View>
      ) : null}

      <AppCard style={styles.card}>
        <View style={styles.previewHeader}>
          <AppText style={styles.cardTitle} weight="bold">Step 2 · Review students</AppText>
          <TouchableOpacity onPress={() => setStep(STEPS.SELECT)}>
            <AppText style={styles.linkText}>Edit scope</AppText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.studentList} nestedScrollEnabled>
          {students.map((s: any) => (
            <View key={s.roll_no} style={styles.studentRow}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.studentName} weight="semibold">{s.student_full_name || s.roll_no}</AppText>
                <AppText style={styles.studentMeta}>
                  {s.class_grade}-{s.section} → {s.to_class_name || '—'}-{s.to_section_name || '—'}
                </AppText>
              </View>
              <View style={styles.actionChips}>
                {(['PROMOTED', 'DETAINED', 'GRADUATED'] as const).map(action => (
                  <TouchableOpacity
                    key={action}
                    style={[styles.chip, s.final_action === action && styles.chipActive]}
                    onPress={() => updateStudentAction(s.roll_no, action)}
                  >
                    <AppText style={[styles.chipText, s.final_action === action && styles.chipTextActive]}>
                      {action.slice(0, 3)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <AppButton title="Continue to confirm" onPress={() => setStep(STEPS.CONFIRM)} />
      </AppCard>
    </>
  );

  const renderConfirmStep = () => (
    <AppCard style={styles.card}>
      <AppText style={styles.cardTitle} weight="bold">Step 3 · Confirm promotion</AppText>
      <AppText style={styles.cardHint}>{batchName}</AppText>
      <AppText style={styles.fieldLabel}>Batch name</AppText>
      <TextInput style={styles.input} value={batchName} onChangeText={setBatchName} />

      <View style={styles.confirmStats}>
        <Users size={18} color={Theme.colors.primary} />
        <AppText style={styles.confirmStatsText}>
          {students.filter((s: any) => s.final_action === 'PROMOTED').length} students will be promoted
        </AppText>
      </View>

      <View style={styles.confirmActions}>
        <AppButton title="Back" type="secondary" onPress={() => setStep(STEPS.PREVIEW)} />
        <View style={{ width: 10 }} />
        <AppButton title={loading ? 'Submitting…' : 'Run promotion'} onPress={submitBatch} disabled={loading} />
      </View>
    </AppCard>
  );

  const renderDoneStep = () => (
    <AppCard style={styles.card}>
      <View style={styles.doneIcon}>
        <CheckCircle2 size={36} color={Theme.colors.success} />
      </View>
      <AppText style={styles.doneTitle} weight="bold">Promotion started</AppText>
      <AppText style={styles.cardHint}>
        {batchStatus?.status
          ? `Status: ${batchStatus.status} · ${batchStatus.success_count ?? 0}/${batchStatus.total_students ?? 0} processed`
          : 'Your batch is processing. Check History for final results.'}
      </AppText>
      <AppButton title="View history" onPress={() => { resetPromoteFlow(); setActiveTab('history'); }} />
      <View style={{ height: 10 }} />
      <AppButton title="Promote again" type="secondary" onPress={resetPromoteFlow} />
    </AppCard>
  );

  const renderYearsTab = () => (
    <>
      <AppCard style={styles.card}>
        <AppText style={styles.cardTitle} weight="bold">Academic Years</AppText>
        <AppText style={styles.cardHint}>Activate upcoming years or close the current year before promoting.</AppText>
        {academicYears.length === 0 ? (
          <AppText style={styles.cardHint}>No academic years found.</AppText>
        ) : academicYears.map((y: any) => (
          <View key={y.year_id} style={styles.yearRow}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.studentName} weight="semibold">{y.year_label}</AppText>
              <AppText style={styles.studentMeta}>{y.start_date} → {y.end_date}</AppText>
              <AppText style={[styles.studentMeta, styles.statusText]}>{y.status}</AppText>
            </View>
            {y.status === 'UPCOMING' && (
              <TouchableOpacity style={styles.smallBtn} onPress={() => activateYear(y)}>
                <AppText style={styles.smallBtnTextSuccess} weight="bold">Activate</AppText>
              </TouchableOpacity>
            )}
            {y.status === 'ACTIVE' && (
              <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => closeYear(y)}>
                <AppText style={styles.smallBtnTextDanger} weight="bold">Close</AppText>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <View style={{ height: 12 }} />
        <AppButton title="+ Add upcoming year" type="secondary" onPress={() => setShowYearModal(true)} />
      </AppCard>

      <AppCard style={styles.card}>
        <AppText style={styles.cardTitle} weight="bold">Staff Leave Transition</AppText>
        <AppText style={styles.cardHint}>Reset or carry forward staff leave balances for a new academic year.</AppText>
        <AppButton title="Reset leave balances" onPress={runLeaveTransition} />
        {transitionEvents.map((ev: any) => (
          <View key={ev.id} style={styles.transitionRow}>
            <AppText style={styles.studentMeta} weight="semibold">
              {ev.event_data?.carry_forward ? 'Carry forward' : 'Full reset'}
            </AppText>
            <AppText style={styles.studentMeta}>
              {ev.created_at ? new Date(ev.created_at).toLocaleDateString('en-IN') : '—'}
            </AppText>
          </View>
        ))}
      </AppCard>
    </>
  );

  const renderSettingsTab = () => {
    const allRule = getRule('ALL');
    const classRules = promoSettings.filter((r: any) => r.class_grade !== 'ALL');
    return (
      <>
        <AppCard style={styles.card}>
          <AppText style={styles.cardTitle} weight="bold">Global promotion rules</AppText>
          <AppText style={styles.cardHint}>Default thresholds for all classes unless overridden below.</AppText>
          {loadingSettings ? (
            <ActivityIndicator color={Theme.colors.primary} style={{ marginVertical: Theme.spacing.md }} />
          ) : (
            <>
              <AppText style={styles.fieldLabel}>Min attendance %</AppText>
              <TextInput
                style={styles.input}
                value={String(allRule.min_attendance_pct ?? 75)}
                onChangeText={v => updatePromoSettingField('ALL', 'min_attendance_pct', Number(v) || 0)}
                keyboardType="number-pad"
              />
              <AppText style={styles.fieldLabel}>Min marks %</AppText>
              <TextInput
                style={styles.input}
                value={String(allRule.min_marks_pct ?? 40)}
                onChangeText={v => updatePromoSettingField('ALL', 'min_marks_pct', Number(v) || 0)}
                keyboardType="number-pad"
              />
              <View style={styles.switchRow}>
                <AppText style={styles.fieldLabel}>Allow with dues</AppText>
                <Switch
                  value={Boolean(allRule.allow_with_dues)}
                  onValueChange={v => updatePromoSettingField('ALL', 'allow_with_dues', v)}
                />
              </View>
              <AppButton title="Save global rules" onPress={() => savePromoSetting(allRule)} disabled={savingSettings} />
            </>
          )}
        </AppCard>

        <AppCard style={styles.card}>
          <AppText style={styles.cardTitle} weight="bold">Class overrides</AppText>
          {classRules.map((rule: any) => (
            <View key={rule.class_grade} style={styles.settingRuleCard}>
              <AppText style={styles.studentName} weight="bold">Class {rule.class_grade}</AppText>
              <AppText style={styles.fieldLabel}>Min attendance %</AppText>
              <TextInput
                style={styles.input}
                value={String(rule.min_attendance_pct ?? 75)}
                onChangeText={v => updatePromoSettingField(rule.class_grade, 'min_attendance_pct', Number(v) || 0)}
                keyboardType="number-pad"
              />
              <AppText style={styles.fieldLabel}>Min marks %</AppText>
              <TextInput
                style={styles.input}
                value={String(rule.min_marks_pct ?? 40)}
                onChangeText={v => updatePromoSettingField(rule.class_grade, 'min_marks_pct', Number(v) || 0)}
                keyboardType="number-pad"
              />
              <View style={styles.switchRow}>
                <AppText style={styles.fieldLabel}>Allow with dues</AppText>
                <Switch
                  value={Boolean(rule.allow_with_dues)}
                  onValueChange={v => updatePromoSettingField(rule.class_grade, 'allow_with_dues', v)}
                />
              </View>
              <AppButton title={`Save class ${rule.class_grade}`} type="secondary" onPress={() => savePromoSetting(getRule(rule.class_grade))} disabled={savingSettings} />
            </View>
          ))}
          <AppText style={styles.fieldLabel}>Add class override</AppText>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={newClassGrade}
              onValueChange={setNewClassGrade}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              dropdownIconColor={PICKER_TEXT}
              mode="dropdown"
            >
              <Picker.Item label="Select class…" value="" color={PICKER_MUTED} />
              {uniqueClasses.filter((c: any) => c !== 'ALL' && !classRules.some((r: any) => r.class_grade === c)).map((c: any) => (
                <Picker.Item key={c} label={c} value={c} color={PICKER_TEXT} />
              ))}
            </Picker>
          </View>
          {newClassGrade ? (
            <AppButton
              title={`Add rules for class ${newClassGrade}`}
              type="secondary"
              onPress={() => {
                updatePromoSettingField(newClassGrade, 'min_attendance_pct', 75);
                setNewClassGrade('');
              }}
            />
          ) : null}
        </AppCard>
      </>
    );
  };

  const renderToolsTab = () => (
    <AppCard style={styles.card}>
      <AppText style={styles.cardTitle} weight="bold">System maintenance</AppText>
      <AppText style={styles.cardHint}>
        Fix student academic year labels after imports. Face embedding sync is available on the web portal.
      </AppText>
      <AppButton title="Fix student academic year labels" onPress={runFixAcademicYears} />
    </AppCard>
  );

  const renderHistoryTab = () => {
    if (loadingHistory) {
      return <ScreenSkeleton variant="list" />;
    }
    if (historyBatches.length === 0) {
      return (
        <AppCard style={styles.card}>
          <Clock size={32} color={Theme.colors.textSec} style={{ alignSelf: 'center', marginBottom: Theme.spacing.md }} />
          <AppText style={styles.emptyTitle} weight="bold">No promotion history yet</AppText>
          <AppText style={styles.cardHint}>Run your first promotion batch to see results here.</AppText>
          <AppButton title="Start promotion" onPress={() => setActiveTab('promote')} />
        </AppCard>
      );
    }
    return (
      <>
        {historyBatches.map((batch: any) => (
          <AppCard key={batch.batch_id} style={styles.historyCard}>
            <AppText style={styles.historyName} weight="bold">{batch.batch_name}</AppText>
            <AppText style={styles.historyMeta}>
              #{batch.batch_id} · {batch.status} · {batch.success_count}/{batch.total_students} processed
              {batch.failure_count ? ` · ${batch.failure_count} errors` : ''}
            </AppText>
            <AppText style={styles.historyDate}>
              {batch.created_at ? new Date(batch.created_at).toLocaleString('en-IN') : '—'}
            </AppText>
            <View style={styles.historyActions}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => fetchBatchDetails(batch.batch_id)}>
                {loadingBatchDetails === batch.batch_id ? (
                  <ActivityIndicator size="small" color={Theme.colors.primary} />
                ) : (
                  <AppText style={styles.smallBtnText} weight="bold">View details</AppText>
                )}
              </TouchableOpacity>
              {String(batch.status).toUpperCase() === 'COMPLETED' && (
                <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => rollbackBatch(batch.batch_id)}>
                  <AppText style={styles.smallBtnTextDanger} weight="bold">Rollback</AppText>
                </TouchableOpacity>
              )}
            </View>
          </AppCard>
        ))}
        {selectedBatchDetails ? (
          <AppCard style={styles.card}>
            <View style={styles.previewHeader}>
              <AppText style={styles.cardTitle} weight="bold">Batch #{selectedBatchDetails.batch_id}</AppText>
              <TouchableOpacity onPress={() => setSelectedBatchDetails(null)}>
                <AppText style={styles.linkText}>Close</AppText>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.studentList} nestedScrollEnabled>
              {selectedBatchDetails.students.map((s: any) => (
                <View key={s.roll_no} style={styles.studentRow}>
                  <AppText style={styles.studentName} weight="semibold">{s.student_full_name || s.roll_no}</AppText>
                  <AppText style={styles.studentMeta}>
                    {s.from_class_name}-{s.from_section_name} → {s.to_class_name || '—'}-{s.to_section_name || '—'}
                  </AppText>
                  <AppText style={styles.studentMeta}>
                    Marks {s.avg_marks_pct ?? '—'}% · Attendance {s.attendance_pct ?? '—'}% · {s.promotion_status}
                  </AppText>
                </View>
              ))}
            </ScrollView>
          </AppCard>
        ) : null}
      </>
    );
  };

  return {
    renderStepBar,
    renderSelectStep,
    renderPreviewStep,
    renderConfirmStep,
    renderDoneStep,
    renderYearsTab,
    renderSettingsTab,
    renderToolsTab,
    renderHistoryTab,
  };
}
