/** Paid plan tiers shown to directors (trial/custom excluded). */
export const PAID_PLAN_ORDER = ['basic', 'starter', 'standard', 'pro', 'premium', 'growth'];

export const PLAN_ORDER = PAID_PLAN_ORDER;

export const PLAN_PROGRESSION: Record<string, string | null> = {
  basic: 'pro',
  starter: 'standard',
  standard: 'pro',
  pro: 'premium',
  premium: null,
  growth: null,
};

export const getNextPlanCode = (currentCode?: string) => {
  const code = (currentCode || 'basic').toLowerCase();
  return PLAN_PROGRESSION[code] || null;
};

/** Effective branch cap from subscription row (custom override or plan catalog). */
export const getEffectiveBranchLimit = (subscription: any) => {
  if (!subscription) {return 1;}
  const custom = subscription.custom_max_branches;
  if (custom !== null && custom !== undefined && custom !== '') {
    const n = Number(custom);
    if (!Number.isNaN(n)) {return n;}
  }
  const planMax = subscription.plan_max_branches;
  if (planMax !== null && planMax !== undefined && planMax !== '') {
    const n = Number(planMax);
    if (!Number.isNaN(n)) {return n;}
  }
  return 1;
};

export const formatBranchLimit = (limit: number) =>
  limit === -1 ? 'Unlimited' : String(limit);

export const canAddBranch = (branchCount: number, limit: number) =>
  limit === -1 || Number(branchCount || 0) < limit;

export const isAtBranchLimit = (branchCount: number, limit: number) =>
  limit !== -1 && Number(branchCount || 0) >= limit;

export const extractNumericPrice = (priceValue?: string | number | null): number => {
  if (priceValue === null || priceValue === undefined) {return 0;}
  if (typeof priceValue === 'number') {return priceValue;}

  const match = String(priceValue).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

export const formatPlanPriceAmount = (amount: number): string => {
  if (!amount || amount <= 0) {return '';}
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

/** Normalize API payload from pricing/public/plans and similar endpoints. */
export const parsePublicPricingPlans = (data: unknown): any[] => {
  if (Array.isArray(data)) { return data; }
  if (!data || typeof data !== 'object') { return []; }
  const root = data as Record<string, unknown>;
  if (Array.isArray(root.plans)) { return root.plans; }
  if (Array.isArray(root.items)) { return root.items; }
  if (Array.isArray(root.data)) { return root.data; }
  return [];
};

export const formatPlanPriceText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') { return ''; }
  if (typeof value === 'number') {
    return value <= 0 ? '' : formatPlanPriceAmount(value);
  }
  const str = String(value).trim();
  if (!str) { return ''; }
  if (/custom/i.test(str)) { return 'Custom Pricing'; }
  if (/free|trial/i.test(str) && extractNumericPrice(str) === 0) { return 'Free'; }
  if (str.includes('₹') || str.includes('$')) { return str; }
  const numeric = extractNumericPrice(str);
  if (numeric > 0) { return formatPlanPriceAmount(numeric); }
  return str;
};

/** Show API-stored prices without duplicating the currency symbol. */
export const formatStoredPriceDisplay = (value: unknown, fallback = '₹0'): string => {
  const formatted = formatPlanPriceText(value);
  if (formatted) { return formatted; }
  if (value === 0 || value === '0') { return '₹0'; }
  return fallback;
};

const pickCyclePrice = (plan: any, billingCycle: 'monthly' | 'yearly'): unknown => {
  if (billingCycle === 'yearly') {
    return (
      plan?.yearly_price ??
      plan?.price_yearly ??
      plan?.annual_price ??
      plan?.year_price ??
      plan?.yearlyPrice ??
      plan?.yearly_amount
    );
  }
  return (
    plan?.monthly_price ??
    plan?.price_monthly ??
    plan?.month_price ??
    plan?.price ??
    plan?.monthlyPrice ??
    plan?.monthly_amount ??
    plan?.amount
  );
};

const pickCyclePromo = (plan: any, billingCycle: 'monthly' | 'yearly'): unknown => {
  if (billingCycle === 'yearly') {
    return plan?.promo_yearly ?? plan?.promo_yearly_price ?? plan?.discount_yearly;
  }
  return plan?.promo_monthly ?? plan?.promo_monthly_price ?? plan?.discount_monthly;
};

export const isTrialOrFreePlan = (plan: any): boolean => {
  const code = String(plan?.plan_code ?? plan?.code ?? '').toLowerCase();
  const title = String(plan?.title ?? plan?.name ?? plan?.plan_name ?? '').toLowerCase();
  if (code === 'trial' || title.includes('trial')) { return true; }
  const monthly = formatPlanPriceText(pickCyclePrice(plan, 'monthly'));
  const yearly = formatPlanPriceText(pickCyclePrice(plan, 'yearly'));
  const label = String(plan?.price_label ?? '').toLowerCase();
  return isFreePricing(monthly) && isFreePricing(yearly) && (label.includes('trial') || label.includes('free') || label.includes('7 day'));
};

export const isCustomPricing = (
  priceValue?: string | null,
  title = '',
  planCode = '',
): boolean => {
  const code = String(planCode || '').toLowerCase();
  const normalizedTitle = String(title || '').toLowerCase();
  if (code === 'custom') { return true; }
  if (/custom/i.test(String(priceValue || ''))) { return true; }
  if (/enterprise|premium plus|contact us/i.test(normalizedTitle) && extractNumericPrice(priceValue) === 0) {
    return true;
  }
  return false;
};

export const isFreePricing = (priceValue?: string | number | null): boolean => {
  const normalized = String(priceValue || '').trim().toLowerCase();

  if (normalized.includes('custom')) {return false;}

  return (
    normalized === 'free' ||
    normalized === 'trial' ||
    normalized === '₹0' ||
    normalized === '$0' ||
    extractNumericPrice(priceValue) === 0
  );
};

/** Paid catalog plans only — excludes trial, free, hidden, and custom-quote tiers. */
export const isPublicVisiblePlan = (plan: any): boolean => {
  if (plan?.is_hidden === true || plan?.hidden === true) { return false; }
  if (plan?.active === false || plan?.is_active === false) { return false; }
  if (plan?.status === 'inactive' || plan?.status === 'draft' || plan?.status === 'archived') {
    return false;
  }
  if (isTrialOrFreePlan(plan)) { return false; }

  const code = String(plan?.plan_code ?? plan?.code ?? '').toLowerCase();
  const title = String(plan?.title ?? plan?.name ?? plan?.plan_name ?? '').toLowerCase();
  const monthly = formatPlanPriceText(pickCyclePrice(plan, 'monthly'));
  const yearly = formatPlanPriceText(pickCyclePrice(plan, 'yearly'));
  const label = String(plan?.price_label ?? '');

  if (isCustomPricing(monthly, title, code) && isCustomPricing(yearly, title, code)) {
    return false;
  }
  if (/custom pricing/i.test(label)) { return false; }

  return true;
};

/** Plans are billed per active branch unless price_meta says otherwise. */
export const isPerBranchPricing = (plan: any): boolean => {
  const meta = String(plan?.price_meta ?? plan?.priceMeta ?? '').toLowerCase();
  if (meta.includes('flat') || meta.includes('fixed')) { return false; }
  if (meta.includes('per branch') || meta.includes('per_branch') || meta.includes('per-branch')) {
    return true;
  }
  return !isTrialOrFreePlan(plan) && !isCustomPricing(
    formatPlanPriceText(pickCyclePrice(plan, 'monthly')),
    plan?.title,
    plan?.plan_code,
  );
};

export const calculatePlanTotalPrice = (
  unitPrice: number,
  branchCount: number,
  perBranch = true,
): number => {
  const branches = Math.max(1, Math.round(Number(branchCount) || 1));
  if (!perBranch || unitPrice <= 0) { return unitPrice; }
  return unitPrice * branches;
};

export const getPlanSortIndex = (plan: any): number => {
  const explicit = plan?.sort_order ?? plan?.sortOrder;
  if (explicit !== null && explicit !== undefined && explicit !== '') {
    const n = Number(explicit);
    if (!Number.isNaN(n)) { return n; }
  }
  const code = String(plan?.plan_code ?? plan?.code ?? '').toLowerCase();
  const index = PAID_PLAN_ORDER.indexOf(code);
  if (index !== -1) { return index; }
  const title = String(plan?.title ?? plan?.name ?? '').toLowerCase();
  const titleIndex = PAID_PLAN_ORDER.findIndex((planKey) => title.includes(planKey));
  return titleIndex === -1 ? 999 : titleIndex;
};

/** Build bullet list for pricing cards from DB features + limits + toggles. */
export const buildPlanDisplayFeatures = (plan: any): string[] => {
  const raw = plan?.features;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((f) => String(f).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (parsed.length) {return parsed;}
  }

  const fj = plan?.features_json || {};
  const lines: string[] = [];
  const mb = plan?.max_branches;
  if (mb === -1) {lines.push('Unlimited Branches');}
  else if (mb != null) {lines.push(`Up to ${mb} Branch${mb === 1 ? '' : 'es'}`);}

  if (plan?.max_students === -1) {lines.push('Unlimited Students');}
  else if (plan?.max_students > 0) {lines.push(`Up to ${plan.max_students} Students`);}

  if (plan?.max_staff === -1) {lines.push('Unlimited Teachers');}
  else if (plan?.max_staff > 0) {lines.push(`Up to ${plan.max_staff} Teachers`);}

  if (fj.manual_attendance) {lines.push('Manual Attendance');}
  if (fj.photo_attendance) {lines.push('Photo Attendance');}
  if (fj.video_attendance) {lines.push('Video Attendance');}
  if (fj.aadhaar_verification) {lines.push('Aadhaar Verification');}
  if (fj.custom_branding) {lines.push('Custom Branding');}

  const reports = String(fj.reports || '').toLowerCase();
  if (reports === 'advanced') {lines.push('Advanced Reports');}
  else if (reports === 'basic') {lines.push('Basic Reports');}

  const retention = plan?.media_retention_days;
  if (retention === -1) {lines.push('Unlimited Attendance Media Storage');}
  else if (retention > 0) {
    lines.push(`${retention} Day${retention === 1 ? '' : 's'} Media Storage`);
  }

  if (isPerBranchPricing(plan)) {
    lines.push('Billed per branch');
  }

  return lines;
};

export const getPricingText = (plan: any, billingCycle: 'monthly' | 'yearly' = 'monthly'): string => {
  const selectedPrice = pickCyclePrice(plan, billingCycle);
  const fallbackPrice = billingCycle === 'yearly'
    ? pickCyclePrice({ ...plan, yearly_price: undefined }, 'monthly')
    : pickCyclePrice({ ...plan, monthly_price: undefined }, 'yearly');
  const formatted = formatPlanPriceText(selectedPrice ?? fallbackPrice);
  return formatted || '';
};

export const buildPlanPriceBreakdown = (
  unitPrice: number,
  branchCount: number,
  billingCycle: 'monthly' | 'yearly',
  perBranch: boolean,
): string => {
  const branches = Math.max(1, Math.round(Number(branchCount) || 1));
  const cycleLabel = billingCycle === 'yearly' ? 'year' : 'month';
  if (!perBranch || unitPrice <= 0) {
    return '';
  }
  return `${formatPlanPriceAmount(unitPrice)}/branch × ${branches} branch${branches === 1 ? '' : 'es'}/${cycleLabel}`;
};

export const normalizePricingPlan = (
  plan: any,
  billingCycle: 'monthly' | 'yearly' = 'monthly',
  branchCount = 1,
) => {
  const title = plan.title || plan.name || plan.plan_name || plan.plan_code || 'Plan';
  const planCode = plan.plan_code || plan.code || '';
  const originalRaw =
    pickCyclePrice(plan, billingCycle) ??
    pickCyclePrice(plan, billingCycle === 'monthly' ? 'yearly' : 'monthly');
  const originalPrice = formatPlanPriceText(originalRaw) || '';
  const promoRaw = pickCyclePromo(plan, billingCycle);
  const promoPrice = promoRaw ? formatPlanPriceText(promoRaw) : '';

  const hasPromo = !!promoPrice && promoPrice.trim() !== '' && promoPrice !== originalPrice;
  const perBranch = isPerBranchPricing(plan);
  const unitPrice = extractNumericPrice(hasPromo ? promoPrice : originalPrice);
  const branches = Math.max(1, Math.round(Number(branchCount) || 1));
  const totalPrice = calculatePlanTotalPrice(unitPrice, branches, perBranch);
  const totalPriceText = formatPlanPriceAmount(totalPrice);
  const unitPriceText = formatPlanPriceAmount(unitPrice);
  const priceBreakdown = buildPlanPriceBreakdown(unitPrice, branches, billingCycle, perBranch);

  let registrationPlan = planCode || String(plan.id);

  return {
    id: plan.id ?? plan.plan_id ?? plan.code,
    plan_code: planCode,
    title,
    name: title,
    description: plan.description || plan.subtitle || plan.summary || '',
    features: buildPlanDisplayFeatures(plan),
    monthly_price: formatPlanPriceText(plan.monthly_price ?? plan.price_monthly ?? plan.price),
    yearly_price: formatPlanPriceText(plan.yearly_price ?? plan.price_yearly ?? plan.annual_price),
    price_label: plan.price_label || '',
    price_meta: plan.price_meta || '',
    promo_monthly: formatPlanPriceText(plan.promo_monthly ?? plan.promo_monthly_price),
    promo_yearly: formatPlanPriceText(plan.promo_yearly ?? plan.promo_yearly_price),
    active: plan.active !== false && plan.is_active !== false,
    highlighted: Boolean(plan.highlighted ?? plan.is_popular ?? plan.popular),
    originalPriceText: originalPrice,
    promoPriceText: promoPrice,
    unitPriceText,
    totalPriceText,
    selectedPriceText: totalPriceText || originalPrice,
    priceBreakdown,
    hasPromo,
    perBranch,
    unitPrice,
    branchCount: branches,
    totalPrice,
    priceValue: totalPrice,
    isFree: isFreePricing(originalPrice),
    isCustomPricing: isCustomPricing(originalPrice, title, planCode),
    registrationPlan,
    sortIndex: getPlanSortIndex(plan),
    max_branches: plan.max_branches || 1,
    media_retention_days: plan.media_retention_days || 0,
    features_json: plan.features_json || {},
  };
};

export const sortPricingPlans = (plans: any[]) =>
  [...plans].sort((a, b) => a.sortIndex - b.sortIndex || Number(a.id) - Number(b.id));

/** Keep only the first N public paid plans (default 3). */
export const selectPublicPaidPlans = (plans: any[], limit = 3) =>
  sortPricingPlans(plans.filter(isPublicVisiblePlan)).slice(0, limit);
