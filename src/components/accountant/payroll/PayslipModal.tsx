import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Theme } from '../../../theme/tokens';
import { formatDateSafe, fmt, generatePayslipPDF } from './helpers';
import type { CorporateConfig, PayrollResult } from './types';
import { payrollStyles as styles } from './payrollStyles';

type Props = {
  result: PayrollResult;
  month: string;
  year: string;
  companyName: string;
  schoolCode: string;
  onClose: () => void;
};

export default function PayslipModal({ result, month, year, companyName, schoolCode, onClose }: Props) {
  const [exporting, setExporting] = useState(false);
  const emp = result.employee;
  const empName = emp.teacher_full_name || 'Employee';
  const mode = result.mode;
  const formatMoney = (amount: number) => `₹${fmt(amount)}`;

  const handleExport = async () => {
    setExporting(true);
    try {
      await generatePayslipPDF(result, month, String(year), schoolCode, true, companyName);
    } catch {
      Alert.alert('Error', 'PDF export failed.');
    } finally {
      setExporting(false);
    }
  };

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Payslip – ${empName}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui, -apple-system, sans-serif;background:#fff;color:#111;font-size:12px;padding:20px}.header{padding:20px 16px;border-bottom:2px solid #111;display:flex;justify-content:space-between}.franchise-name{font-size:18px;font-weight:800}.slip-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-top:3px}.period-box{text-align:right}.period-month{font-size:14px;font-weight:700}.period-gen{font-size:8px;color:#777;margin-top:3px}.info-grid{display:grid;grid-template-columns:repeat(3,1fr);border-left:1px solid #d1d5db;border-top:1px solid #d1d5db}.info-cell{padding:8px 12px;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db}.info-label{font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px}.info-value{font-size:12px;font-weight:600}.att-grid{display:grid;grid-template-columns:repeat(5,1fr);border-left:1px solid #d1d5db;border-bottom:1px solid #d1d5db}.att-cell{padding:10px 6px;text-align:center;border-right:1px solid #d1d5db}.att-num{font-size:18px;font-weight:800}.att-label{font-size:7px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-top:3px}.earn-ded-grid{display:grid;grid-template-columns:1fr 1fr;border-left:1px solid #d1d5db}.col-header{padding:6px 12px;font-size:8px;font-weight:800;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #d1d5db;border-top:1px solid #d1d5db;background:#f9fafb}.row{display:flex;justify-content:space-between;padding:5px 12px;border-bottom:1px solid #ececec}.total-row{display:flex;justify-content:space-between;padding:6px 12px;font-weight:700;border-top:2px solid #111;border-bottom:1px solid #d1d5db}.net-band{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border:2px solid #111;margin:12px}.net-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-bottom:4px}.net-amt{font-size:24px;font-weight:800}.net-side{text-align:right;font-size:9px}.footer{display:flex;justify-content:space-between;align-items:flex-end;padding:14px 20px;border-top:1px solid #d1d5db;font-size:9px;color:#666}.sig-box{border:1px dashed #aaa;padding:12px 20px;text-align:center;min-width:100px}</style></head><body>
<div class="header"><div><div class="franchise-name">${companyName || 'Organization'}</div><div class="slip-label">SALARY SLIP · ${mode === 'fixed' ? 'FIXED PAYROLL' : 'CORPORATE PAYROLL'}</div></div><div class="period-box"><div class="period-month">${month} ${year}</div><div class="period-gen">Generated: ${formatDateSafe(new Date())}</div></div></div>
<div class="info-grid"><div class="info-cell"><div class="info-label">EMPLOYEE NAME</div><div class="info-value">${emp.teacher_full_name || 'N/A'}</div></div><div class="info-cell"><div class="info-label">EMPLOYEE ID</div><div class="info-value">${emp.employee_id || 'N/A'}</div></div><div class="info-cell"><div class="info-label">DESIGNATION</div><div class="info-value">${emp.designation || '—'}</div></div><div class="info-cell"><div class="info-label">DATE OF JOINING</div><div class="info-value">${emp.date_of_joining ? formatDateSafe(emp.date_of_joining) : '—'}</div></div><div class="info-cell"><div class="info-label">EMPLOYMENT TYPE</div><div class="info-value">${emp.employment_type || '—'}</div></div><div class="info-cell"><div class="info-label">PAY PERIOD</div><div class="info-value">${month} ${year}</div></div></div>
<div class="att-grid"><div class="att-cell"><div class="att-num">${result.applicable_working_days || result.cfg.working_days}</div><div class="att-label">WORKING DAYS</div></div><div class="att-cell"><div class="att-num">${result.present_days}</div><div class="att-label">DAYS PRESENT</div></div><div class="att-cell"><div class="att-num">${result.late_days || 0}</div><div class="att-label">LATE DAYS</div></div><div class="att-cell"><div class="att-num">${result.paid_leave_used}</div><div class="att-label">PAID LEAVE USED</div></div><div class="att-cell"><div class="att-num">${result.lop_days}</div><div class="att-label">LOP DAYS</div></div></div>
<div class="earn-ded-grid"><div><div class="col-header">EARNINGS</div><div class="row"><span>Basic Salary</span><span>${formatMoney(result.basic)}</span></div>${mode === 'corporate' && result.hra > 0 ? `<div class="row"><span>HRA (${(result.cfg as CorporateConfig).hra_pct}%)</span><span>${formatMoney(result.hra)}</span></div>` : ''}${mode === 'corporate' && result.da > 0 ? `<div class="row"><span>DA (${(result.cfg as CorporateConfig).da_pct}%)</span><span>${formatMoney(result.da)}</span></div>` : ''}${mode === 'corporate' && result.ta > 0 ? `<div class="row"><span>TA (${(result.cfg as CorporateConfig).ta_pct}%)</span><span>${formatMoney(result.ta)}</span></div>` : ''}<div class="total-row"><span>Gross Earnings</span><span>${formatMoney(result.gross)}</span></div></div>
<div><div class="col-header">DEDUCTIONS</div>${result.lop_deduction > 0 ? `<div class="row"><span>Loss of Pay (${result.lop_days}d)</span><span>–${formatMoney(result.lop_deduction)}</span></div>` : ''}${result.pf > 0 ? `<div class="row"><span>Provident Fund (${(result.cfg as CorporateConfig).pf_pct}%)</span><span>–${formatMoney(result.pf)}</span></div>` : ''}${result.esi > 0 ? `<div class="row"><span>ESI (${(result.cfg as CorporateConfig).esi_pct}%)</span><span>–${formatMoney(result.esi)}</span></div>` : ''}${result.professional_tax > 0 ? `<div class="row"><span>Professional Tax</span><span>–${formatMoney(result.professional_tax)}</span></div>` : ''}<div class="total-row"><span>Total Deductions</span><span>–${formatMoney(result.total_deductions)}</span></div></div></div>
<div class="net-band"><div><div class="net-label">NET PAY (TAKE HOME)</div><div class="net-amt">${formatMoney(result.net)}</div></div><div class="net-side"><div>Gross Earnings ${formatMoney(result.gross)}</div><div style="margin-top:3px">Total Deductions –${formatMoney(result.total_deductions)}</div></div></div>
<div class="footer"><div><div>This is a system-generated payslip and does not require a physical signature.</div><div style="margin-top:3px">${companyName} · ${month} ${year}</div></div><div class="sig-box"><div style="height:24px"></div><div style="border-top:1px solid #aaa;padding-top:5px;font-size:8px">Authorised Signatory</div></div></div>
</body></html>`;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.payslipHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>{empName}</Text>
            <Text style={styles.modalSubtitle}>{month} {year} · {mode === 'fixed' ? 'Fixed' : 'Corporate'} Payroll</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonTextClose}>Close</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.webviewContainer}>
          <WebView originWhitelist={['*']} source={{ html: htmlContent }} style={styles.webview} />
        </View>
        <View style={styles.payslipFooter}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.modalButton, styles.modalButtonPrimary, styles.payslipDownloadBtn]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? <ActivityIndicator size="small" color={Theme.colors.card} /> : <Text style={styles.modalButtonText}>Download PDF</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
