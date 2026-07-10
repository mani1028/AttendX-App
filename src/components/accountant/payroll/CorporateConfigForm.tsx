import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';
import { fmt, uid } from './helpers';
import { PayrollField, PctInput, RupeeInput } from './PayrollFormFields';
import type { CorporateConfig } from './types';
import { payrollStyles as styles } from './payrollStyles';

type Props = {
  cfg: CorporateConfig;
  onChange: (cfg: CorporateConfig) => void;
};

export default function CorporateConfigForm({ cfg, onChange }: Props) {
  const extras = cfg.extra_allowances || [];
  const extraDeds = cfg.extra_deductions || [];
  const sampleCTC = 10000;
  const sampleBasic = sampleCTC * cfg.basic_pct / 100;
  const sampleGross = sampleBasic + sampleCTC * cfg.hra_pct / 100 + sampleCTC * cfg.da_pct / 100 + sampleCTC * cfg.ta_pct / 100 + sampleCTC * cfg.other_allowance_pct / 100 + extras.reduce((s, a) => s + sampleCTC * a.pct / 100, 0);
  const samplePF = sampleBasic * cfg.pf_pct / 100;
  const sampleESI = sampleBasic * cfg.esi_pct / 100;
  const sampleNet = Math.max(0, sampleGross - (samplePF + sampleESI + cfg.professional_tax + sampleBasic * cfg.other_deduction_pct / 100 + extraDeds.reduce((s, d) => s + sampleBasic * d.pct / 100, 0)));

  return (
    <View style={styles.configForm}>
      <PayrollField label="Basic % of CTC" width="100%"><PctInput value={cfg.basic_pct} onChange={(v) => onChange({ ...cfg, basic_pct: v })} /></PayrollField>
      <View style={styles.divider} />
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Allowances — % of CTC</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.addButton} onPress={() => onChange({ ...cfg, extra_allowances: [...extras, { id: uid(), label: 'Extra Allowance', pct: 0 }] })}>
            <Text style={styles.addButtonTextRed}>+ Add Allowance</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.allowancesGrid}>
          <PayrollField label="HRA %" width="48%"><PctInput value={cfg.hra_pct} onChange={(v) => onChange({ ...cfg, hra_pct: v })} /></PayrollField>
          <PayrollField label="DA %" width="48%"><PctInput value={cfg.da_pct} onChange={(v) => onChange({ ...cfg, da_pct: v })} /></PayrollField>
          <PayrollField label="TA %" width="48%"><PctInput value={cfg.ta_pct} onChange={(v) => onChange({ ...cfg, ta_pct: v })} /></PayrollField>
          <PayrollField label="Other %" width="48%"><PctInput value={cfg.other_allowance_pct} onChange={(v) => onChange({ ...cfg, other_allowance_pct: v })} /></PayrollField>
        </View>
        {extras.map((ea) => (
          <View key={ea.id} style={styles.extraItemContainer}>
            <TextInput style={styles.extraItemInput} value={ea.label} onChangeText={(text) => onChange({ ...cfg, extra_allowances: extras.map(a => a.id === ea.id ? { ...a, label: text } : a) })} placeholder="Allowance label" />
            <PctInput value={ea.pct} onChange={(v) => onChange({ ...cfg, extra_allowances: extras.map(a => a.id === ea.id ? { ...a, pct: v } : a) })} />
            <TouchableOpacity accessibilityRole="button" style={styles.removeButton} onPress={() => onChange({ ...cfg, extra_allowances: extras.filter(a => a.id !== ea.id) })}>
              <Trash2 size={16} color={Theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.divider} />
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Deductions</Text>
          <TouchableOpacity accessibilityRole="button" style={[styles.addButton, styles.addButtonRed]} onPress={() => onChange({ ...cfg, extra_deductions: [...extraDeds, { id: uid(), label: 'Extra Deduction', pct: 0 }] })}>
            <Text style={styles.addButtonTextRed}>+ Add Deduction</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.deductionsGrid}>
          <PayrollField label="PF % of Basic" width="48%"><PctInput value={cfg.pf_pct} onChange={(v) => onChange({ ...cfg, pf_pct: v })} /></PayrollField>
          <PayrollField label="ESI % of Basic" width="48%"><PctInput value={cfg.esi_pct} onChange={(v) => onChange({ ...cfg, esi_pct: v })} /></PayrollField>
          <PayrollField label="Prof. Tax ₹" width="48%"><RupeeInput value={cfg.professional_tax} onChange={(v) => onChange({ ...cfg, professional_tax: v })} /></PayrollField>
          <PayrollField label="Other Ded %" width="48%"><PctInput value={cfg.other_deduction_pct} onChange={(v) => onChange({ ...cfg, other_deduction_pct: v })} /></PayrollField>
        </View>
        {extraDeds.map((ed) => (
          <View key={ed.id} style={[styles.extraItemContainer, styles.extraItemContainerRed]}>
            <TextInput style={styles.extraItemInput} value={ed.label} onChangeText={(text) => onChange({ ...cfg, extra_deductions: extraDeds.map(d => d.id === ed.id ? { ...d, label: text } : d) })} placeholder="Deduction label" />
            <PctInput value={ed.pct} onChange={(v) => onChange({ ...cfg, extra_deductions: extraDeds.map(d => d.id === ed.id ? { ...d, pct: v } : d) })} />
            <TouchableOpacity accessibilityRole="button" style={styles.removeButton} onPress={() => onChange({ ...cfg, extra_deductions: extraDeds.filter(d => d.id !== ed.id) })}>
              <Trash2 size={16} color={Theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewHeaderTitle}>Live Preview — ₹{fmt(sampleCTC)} CTC</Text>
        </View>
        <View style={styles.previewContent}>
          <View style={styles.previewRow}>
            <View style={styles.previewColumn}>
              <Text style={styles.previewSubtitle}>Earnings</Text>
              <View style={styles.previewLine}><Text style={styles.previewLabel}>Basic ({cfg.basic_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleBasic)}</Text></View>
              {cfg.hra_pct > 0 ? <View style={styles.previewLine}><Text style={styles.previewLabel}>HRA ({cfg.hra_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.hra_pct / 100)}</Text></View> : null}
              {cfg.da_pct > 0 ? <View style={styles.previewLine}><Text style={styles.previewLabel}>DA ({cfg.da_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.da_pct / 100)}</Text></View> : null}
              {cfg.ta_pct > 0 ? <View style={styles.previewLine}><Text style={styles.previewLabel}>TA ({cfg.ta_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.ta_pct / 100)}</Text></View> : null}
              {cfg.other_allowance_pct > 0 ? <View style={styles.previewLine}><Text style={styles.previewLabel}>{cfg.other_allowance_label || 'Other'} ({cfg.other_allowance_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.other_allowance_pct / 100)}</Text></View> : null}
              {extras.map((ea) => ea.pct > 0 ? (
                <View key={ea.id} style={styles.previewLine}>
                  <Text style={styles.previewLabel} numberOfLines={1}>{ea.label || 'Extra'} ({ea.pct}%)</Text>
                  <Text style={styles.previewValue}>₹{fmt(sampleCTC * ea.pct / 100)}</Text>
                </View>
              ) : null)}
              <View style={[styles.previewLine, styles.previewTotalLine]}><Text style={styles.previewTotalLabel}>Gross</Text><Text style={styles.previewTotalValue}>₹{fmt(sampleGross)}</Text></View>
            </View>
            <View style={styles.previewColDivider} />
            <View style={styles.previewColumn}>
              <Text style={styles.previewSubtitle}>Deductions</Text>
              {cfg.pf_pct > 0 ? <View style={styles.previewLine}><Text style={styles.previewLabel}>PF ({cfg.pf_pct}%)</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(samplePF)}</Text></View> : null}
              {cfg.esi_pct > 0 ? <View style={styles.previewLine}><Text style={styles.previewLabel}>ESI ({cfg.esi_pct}%)</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(sampleESI)}</Text></View> : null}
              {cfg.professional_tax > 0 ? <View style={styles.previewLine}><Text style={styles.previewLabel}>Prof. Tax</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(cfg.professional_tax)}</Text></View> : null}
              {cfg.other_deduction_pct > 0 ? <View style={styles.previewLine}><Text style={styles.previewLabel}>{cfg.other_deduction_label || 'Other Ded'} ({cfg.other_deduction_pct}%)</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(sampleBasic * cfg.other_deduction_pct / 100)}</Text></View> : null}
              {extraDeds.map((ed) => ed.pct > 0 ? (
                <View key={ed.id} style={styles.previewLine}>
                  <Text style={styles.previewLabel} numberOfLines={1}>{ed.label || 'Extra Ded'} ({ed.pct}%)</Text>
                  <Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(sampleBasic * ed.pct / 100)}</Text>
                </View>
              ) : null)}
              <View style={[styles.previewLine, styles.previewTotalLine]}><Text style={styles.previewTotalLabel}>Net Pay</Text><Text style={[styles.previewTotalValue, styles.previewTotalValueGreen]}>₹{fmt(sampleNet)}</Text></View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
