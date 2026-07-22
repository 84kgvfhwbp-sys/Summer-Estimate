export const CREW_RATES = Object.freeze({ one: 75, two: 120 });

export function numberValue(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function defaultEstimate(overrides = {}) {
  const year = new Date().getFullYear() + 1;
  return {
    id: null,
    estimateNumber: '',
    estimateName: '',
    siteAddress: '',
    squareFootage: '',
    season: `Summer ${year}`,
    preparedBy: '',

    crewType: 'two',
    crewRate: 120,
    weeklyEnabled: false,
    weeklyTime: '',
    weeklyVisits: 22,
    gardensEnabled: false,
    gardensTime: '',
    gardensVisits: 10,
    clippingsEnabled: false,
    clippingsFee: 50,

    fertSpringEnabled: false,
    fertSummerEnabled: false,
    fertFallEnabled: false,
    fertSpringRate: 0.012,
    fertSummerRate: 0.012,
    fertFallRate: 0.012,
    limeSpringEnabled: false,
    limeSummerEnabled: false,
    limeFallEnabled: false,
    limeSpringRate: 0.015,
    limeSummerRate: 0.015,
    limeFallRate: 0.015,
    fertLabourTime: '',
    fertLabourRate: 75,

    springCleanupEnabled: false,
    springCleanupTime: '',
    springCleanupRate: 180,
    springDisposalEnabled: true,
    springDisposalFee: 50,
    fallCleanupEnabled: false,
    fallCleanupTime: '',
    fallCleanupRate: 180,
    fallDisposalEnabled: true,
    fallDisposalFee: 50,

    mulchEnabled: false,
    mulchYards: '',
    mulchRate: 83.75,
    springAerationEnabled: false,
    springAerationRate: 0.02,
    springAerationDeliveryEnabled: true,
    springAerationDeliveryFee: 75,
    fallAerationEnabled: false,
    fallAerationRate: 0.02,
    fallAerationDeliveryEnabled: true,
    fallAerationDeliveryFee: 75,

    litterEnabled: false,
    litterTime: '',
    litterVisits: '',
    litterRate: 75,
    litterDisposalFee: 50,

    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

export function calculateEstimate(values) {
  const v = values || {};
  const n = (key) => numberValue(v[key]);
  const c = (key) => Boolean(v[key]);
  const sqft = n('squareFootage');
  const crewRate = n('crewRate');

  const weeklyHours = c('weeklyEnabled') ? n('weeklyTime') * n('weeklyVisits') : 0;
  const weeklyCharge = weeklyHours * crewRate;
  const gardensHours = c('gardensEnabled') ? n('gardensTime') * n('gardensVisits') : 0;
  const gardensCharge = gardensHours * crewRate;
  const clippingsCharge = c('clippingsEnabled') ? n('clippingsFee') : 0;
  const lawnTotal = weeklyCharge + gardensCharge + clippingsCharge;

  const applicationRows = [
    ['fertSpringEnabled', 'fertSpringRate', 'Fertilizer · Spring'],
    ['fertSummerEnabled', 'fertSummerRate', 'Fertilizer · Summer'],
    ['fertFallEnabled', 'fertFallRate', 'Fertilizer · Fall'],
    ['limeSpringEnabled', 'limeSpringRate', 'Lime · Spring'],
    ['limeSummerEnabled', 'limeSummerRate', 'Lime · Summer'],
    ['limeFallEnabled', 'limeFallRate', 'Lime · Fall'],
  ];
  const applicationCharges = applicationRows.map(([enabledKey, rateKey, label]) => ({
    enabled: c(enabledKey),
    label,
    charge: c(enabledKey) ? sqft * n(rateKey) : 0,
  }));
  const applicationCount = applicationCharges.filter((item) => item.enabled).length;
  const fertLabourCharge = n('fertLabourTime') * applicationCount * n('fertLabourRate');
  const fertilizerMaterialTotal = applicationCharges.reduce((sum, item) => sum + item.charge, 0);
  const fertTotal = fertilizerMaterialTotal + fertLabourCharge;

  const springCleanupCharge = c('springCleanupEnabled')
    ? n('springCleanupTime') * n('springCleanupRate') + (c('springDisposalEnabled') ? n('springDisposalFee') : 0)
    : 0;
  const fallCleanupCharge = c('fallCleanupEnabled')
    ? n('fallCleanupTime') * n('fallCleanupRate') + (c('fallDisposalEnabled') ? n('fallDisposalFee') : 0)
    : 0;
  const cleanupTotal = springCleanupCharge + fallCleanupCharge;

  const mulchCharge = c('mulchEnabled') ? n('mulchYards') * n('mulchRate') : 0;
  const springAerationCharge = c('springAerationEnabled')
    ? sqft * n('springAerationRate') + (c('springAerationDeliveryEnabled') ? n('springAerationDeliveryFee') : 0)
    : 0;
  const fallAerationCharge = c('fallAerationEnabled')
    ? sqft * n('fallAerationRate') + (c('fallAerationDeliveryEnabled') ? n('fallAerationDeliveryFee') : 0)
    : 0;
  const maintenanceTotal = mulchCharge + springAerationCharge + fallAerationCharge;

  const litterCharge = c('litterEnabled')
    ? (n('litterTime') * n('litterRate') + n('litterDisposalFee')) * n('litterVisits')
    : 0;

  const grandTotal = lawnTotal + fertTotal + cleanupTotal + maintenanceTotal + litterCharge;

  return {
    sqft,
    crewRate,
    weeklyHours,
    weeklyCharge,
    gardensHours,
    gardensCharge,
    clippingsCharge,
    lawnTotal,
    applicationCharges,
    applicationCount,
    fertilizerMaterialTotal,
    fertLabourCharge,
    fertTotal,
    springCleanupCharge,
    fallCleanupCharge,
    cleanupTotal,
    mulchCharge,
    springAerationCharge,
    fallAerationCharge,
    maintenanceTotal,
    litterCharge,
    grandTotal,
  };
}

export function sectionSummaries(values) {
  const totals = calculateEstimate(values);
  return [
    {
      id: 'lawn',
      number: 1,
      title: 'Lawn Maintenance',
      total: totals.lawnTotal,
      enabledCount: ['weeklyEnabled', 'gardensEnabled', 'clippingsEnabled'].filter((key) => values[key]).length,
      description: 'Mowing, garden visits and clipping disposal',
    },
    {
      id: 'fertilizer',
      number: 2,
      title: 'Fertilization & Lime',
      total: totals.fertTotal,
      enabledCount: totals.applicationCount,
      description: 'Seasonal applications and application labour',
    },
    {
      id: 'cleanup',
      number: 3,
      title: 'Spring / Fall Clean Up',
      total: totals.cleanupTotal,
      enabledCount: ['springCleanupEnabled', 'fallCleanupEnabled'].filter((key) => values[key]).length,
      description: 'Cleanup time, crew rates and disposal',
    },
    {
      id: 'maintenance',
      number: 4,
      title: 'Mulch & Aeration',
      total: totals.maintenanceTotal,
      enabledCount: ['mulchEnabled', 'springAerationEnabled', 'fallAerationEnabled'].filter((key) => values[key]).length,
      description: 'Mulch quantities and seasonal aeration',
    },
    {
      id: 'litter',
      number: 5,
      title: 'Litter Pickup',
      total: totals.litterCharge,
      enabledCount: values.litterEnabled ? 1 : 0,
      description: 'Visit time, frequency and disposal',
    },
  ];
}

export function formatMoney(value) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

export function formatNumber(value, decimals = 0) {
  return Number(value || 0).toLocaleString('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
