export const PLAN_ORDER = ["trial", "basic", "pro", "enterprise"];

// Define the logical upgrade path
export const PLAN_PROGRESSION: Record<string, string | null> = {
  "trial": "basic",
  "basic": "pro",
  "pro": "enterprise",
  "enterprise": null // Highest tier
};

export const getNextPlanCode = (currentCode?: string) => {
  const code = (currentCode || "trial").toLowerCase();
  return PLAN_PROGRESSION[code] || null;
};

/** Effective branch cap from subscription row (custom override or plan catalog). */
export const getEffectiveBranchLimit = (subscription: any) => {
  if (!subscription) return 1;
  const custom = subscription.custom_max_branches;
  if (custom !== null && custom !== undefined && custom !== "") {
    const n = Number(custom);
    if (!Number.isNaN(n)) return n;
  }
  const planMax = subscription.plan_max_branches;
  if (planMax !== null && planMax !== undefined && planMax !== "") {
    const n = Number(planMax);
    if (!Number.isNaN(n)) return n;
  }
  return 1;
};

export const formatBranchLimit = (limit: number) =>
  limit === -1 ? "Unlimited" : String(limit);

export const canAddBranch = (branchCount: number, limit: number) =>
  limit === -1 || Number(branchCount || 0) < limit;

export const isAtBranchLimit = (branchCount: number, limit: number) =>
  limit !== -1 && Number(branchCount || 0) >= limit;

export const extractNumericPrice = (priceValue?: string | number | null): number => {
  if (priceValue === null || priceValue === undefined) return 0;
  if (typeof priceValue === 'number') return priceValue;

  const match = String(priceValue).replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

export const isCustomPricing = (priceValue?: string | null, title = ""): boolean =>
  /custom/i.test(String(priceValue || "")) || /enterprise|premium/i.test(String(title || ""));

export const isFreePricing = (priceValue?: string | number | null): boolean => {
  const normalized = String(priceValue || "").trim().toLowerCase();

  if (normalized.includes("custom")) return false;

  return (
    normalized === "free" ||
    normalized === "trial" ||
    normalized === "₹0" ||
    normalized === "$0" ||
    extractNumericPrice(priceValue) === 0
  );
};

export const getPlanSortIndex = (title: string): number => {
  const normalized = String(title || "").toLowerCase();
  const index = PLAN_ORDER.findIndex((planKey) => normalized.includes(planKey));
  return index === -1 ? 999 : index;
};

/** Build bullet list for website pricing cards from DB features + limits + toggles. */
export const buildPlanDisplayFeatures = (plan: any): string[] => {
  const raw = plan?.features;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((f) => String(f).trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (parsed.length) return parsed;
  }

  const fj = plan?.features_json || {};
  const lines: string[] = [];
  const mb = plan?.max_branches;
  if (mb === -1) lines.push("Unlimited Branches");
  else if (mb != null) lines.push(`${mb} Branch${mb === 1 ? "" : "es"}`);

  if (plan?.max_students === -1) lines.push("Unlimited Students");
  else if (plan?.max_students > 0) lines.push(`Up to ${plan.max_students} Students`);

  if (plan?.max_staff === -1) lines.push("Unlimited Teachers");
  else if (plan?.max_staff > 0) lines.push(`Up to ${plan.max_staff} Teachers`);

  if (fj.manual_attendance) lines.push("Manual Attendance");
  if (fj.photo_attendance) lines.push("Photo Attendance");
  if (fj.video_attendance) lines.push("Video Attendance");
  if (fj.aadhaar_verification) lines.push("Aadhaar Verification");
  if (fj.custom_branding) lines.push("Custom Branding");

  const reports = String(fj.reports || "").toLowerCase();
  if (reports === "advanced") lines.push("Advanced Reports");
  else if (reports === "basic") lines.push("Basic Reports");

  const retention = plan?.media_retention_days;
  if (retention === -1) lines.push("Unlimited Attendance Media Storage");
  else if (retention > 0) {
    lines.push(`${retention} Day${retention === 1 ? "" : "s"} Media Storage`);
  }

  return lines;
};

export const getPricingText = (plan: any, billingCycle: 'monthly' | 'yearly' = "monthly"): string => {
  const selectedPrice =
    billingCycle === "yearly"
      ? plan.yearly_price || plan.monthly_price
      : plan.monthly_price || plan.yearly_price;

  return selectedPrice || "Custom Pricing";
};

export const normalizePricingPlan = (plan: any, billingCycle: 'monthly' | 'yearly' = "monthly") => {
  const originalPrice = getPricingText(plan, billingCycle);
  const promoPrice =
    billingCycle === "yearly"
      ? plan.promo_yearly
      : plan.promo_monthly;

  const hasPromo = !!promoPrice && promoPrice.trim() !== "" && promoPrice !== originalPrice;

  const title = plan.title || "";
  const normalizedTitle = title.toLowerCase();
  
  // Prefer plan_code for registrationPlan, fallback to trial or ID string
  let registrationPlan = plan.plan_code || String(plan.id);
  
  if (isFreePricing(originalPrice) || normalizedTitle.includes("trial") || registrationPlan === "trial") {
    registrationPlan = "trial";
  }

  return {
    id: plan.id,
    plan_code: plan.plan_code,
    title,
    name: title,
    description: plan.description || "",
    features: buildPlanDisplayFeatures(plan),
    monthly_price: plan.monthly_price || "",
    yearly_price: plan.yearly_price || "",
    price_label: plan.price_label || "",
    price_meta: plan.price_meta || "",
    promo_monthly: plan.promo_monthly || "",
    promo_yearly: plan.promo_yearly || "",
    active: plan.active !== false,
    highlighted: Boolean(plan.highlighted),
    originalPriceText: originalPrice,
    promoPriceText: promoPrice,
    selectedPriceText: hasPromo ? promoPrice : originalPrice,
    hasPromo,
    priceValue: extractNumericPrice(hasPromo ? promoPrice : originalPrice),
    isFree: isFreePricing(originalPrice),
    isCustomPricing: isCustomPricing(originalPrice, title),
    registrationPlan,
    sortIndex: plan.sort_order ?? getPlanSortIndex(title),
    max_branches: plan.max_branches || 1,
    media_retention_days: plan.media_retention_days || 0,
    features_json: plan.features_json || {}
  };
};

export const sortPricingPlans = (plans: any[]) =>
  [...plans].sort((a, b) => a.sortIndex - b.sortIndex || a.id - b.id);
