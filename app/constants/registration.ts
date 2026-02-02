export const industryOptions = [
  { label: 'Healthcare & Medical', value: 'healthcare' },
  { label: 'Retail', value: 'retail' },
  { label: 'Restaurants & Food Service', value: 'food' },
  { label: 'Hospitality & Hotels', value: 'hospitality' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Logistics & Warehousing', value: 'logistics' },
  { label: 'Call Center / BPO', value: 'call_center' },
  { label: 'Security Services', value: 'security' },
  { label: 'Cleaning & Janitorial', value: 'cleaning' },
  { label: 'Education', value: 'education' },
  { label: 'Government', value: 'government' },
  { label: 'Other', value: 'other' }
]

export const companySizeOptions = [
  { label: '1-10 employees', value: '1-10' },
  { label: '11-25 employees', value: '11-25' },
  { label: '26-50 employees', value: '26-50' },
  { label: '51-100 employees', value: '51-100' },
  { label: '101-250 employees', value: '101-250' },
  { label: '251-500 employees', value: '251-500' },
  { label: '500+ employees', value: '500+' }
]

export const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Essential scheduling for small teams',
    icon: '🚀',
    features: [
      'Unlimited employees',
      'Basic scheduling',
      'Time clock',
      'Mobile app',
      'RBAC permissions',
      'Email support'
    ],
    limitations: []
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced features for growing businesses',
    icon: '⭐',
    popular: true,
    features: [
      'Everything in Starter, plus:',
      'Advanced scheduling',
      'Shift swapping',
      'PTO management',
      'Analytics dashboard',
      'Priority support',
      'Payroll export'
    ],
    limitations: []
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Compliance-ready for large organizations',
    icon: '🏢',
    features: [
      'Everything in Professional, plus:',
      'HIPAA compliance & BAA',
      'GDPR & SOC 2 Type II',
      'SSO/SAML',
      'API access',
      'Custom integrations',
      'Dedicated CSM',
      '24/7 phone support',
      'SLA guarantee'
    ],
    limitations: []
  }
]

export const stepInfo = [
  { title: 'Account', icon: '👤' },
  { title: 'Company', icon: '🏢' },
  { title: 'Plan', icon: '💎' },
  { title: 'Billing', icon: '💳' }
]

export const complianceOptions = [
  {
    id: 'hipaa',
    name: 'HIPAA',
    region: 'United States',
    description: 'Healthcare organizations handling PHI',
    badge: 'Healthcare',
    color: 'warning',
    features: [
      { icon: '🔒', title: 'Business Associate Agreement', desc: 'Legally binding BAA included' },
      { icon: '📋', title: 'Audit Logging', desc: 'Comprehensive access logs' },
      { icon: '🔐', title: 'Data Encryption', desc: 'AES-256 at rest & in transit' },
      { icon: '🏥', title: 'PHI Protection', desc: 'HIPAA-compliant data handling' }
    ]
  },
  {
    id: 'gdpr',
    name: 'GDPR',
    region: 'European Union',
    description: 'EU data protection compliance',
    badge: 'EU Privacy',
    color: 'primary',
    features: [
      { icon: '🇪🇺', title: 'EU Data Residency', desc: 'Data stored in EU regions' },
      { icon: '📝', title: 'DPA Agreement', desc: 'Data Processing Agreement' },
      { icon: '🗑️', title: 'Right to Erasure', desc: 'Automated data deletion' },
      { icon: '📤', title: 'Data Portability', desc: 'Export employee data' }
    ]
  },
  {
    id: 'soc2',
    name: 'SOC 2 Type II',
    region: 'Global',
    description: 'Enterprise security certification',
    badge: 'Enterprise',
    color: 'success',
    features: [
      { icon: '🛡️', title: 'SOC 2 Certified', desc: 'Annual third-party audit' },
      { icon: '📊', title: 'Security Controls', desc: 'Documented procedures' },
      { icon: '🔍', title: 'Penetration Testing', desc: 'Regular security testing' },
      { icon: '📜', title: 'Compliance Reports', desc: 'On-demand audit reports' }
    ]
  }
]

// Keep for backwards compatibility
export const hipaaFeatures = complianceOptions.find(c => c.id === 'hipaa')?.features || []

export const testimonials = [
  {
    quote: "ShiftFlow cut our scheduling time by 80%. What used to take hours now takes minutes.",
    author: "Sarah Chen",
    role: "Operations Manager",
    company: "RetailCo",
    avatar: "SC"
  },
  {
    quote: "The HIPAA compliance features gave us peace of mind. Essential for healthcare.",
    author: "Dr. Michael Ross",
    role: "Medical Director",
    company: "CareFirst Clinic",
    avatar: "MR"
  },
  {
    quote: "ROI was immediate. We reduced overtime by 25% in the first month.",
    author: "David Park",
    role: "CFO",
    company: "LogiTech Solutions",
    avatar: "DP"
  },
  {
    quote: "Our 500+ employees across 12 locations are all on one platform now.",
    author: "Amanda Foster",
    role: "VP Operations",
    company: "QuickServe Inc",
    avatar: "AF"
  }
]
