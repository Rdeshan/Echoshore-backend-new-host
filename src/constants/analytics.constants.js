module.exports = {
  // Plastic type categories and their environmental impact weights
  PLASTIC_TYPES: {
    PET: {
      code: 'PET',
      name: 'Polyethylene Terephthalate',
      weight: 1.2,
      recyclable: true,
    },
    HDPE: {
      code: 'HDPE',
      name: 'High-Density Polyethylene',
      weight: 1.1,
      recyclable: true,
    },
    PVC: {
      code: 'PVC',
      name: 'Polyvinyl Chloride',
      weight: 1.8,
      recyclable: false,
    },
    LDPE: {
      code: 'LDPE',
      name: 'Low-Density Polyethylene',
      weight: 1.0,
      recyclable: true,
    },
    PP: { code: 'PP', name: 'Polypropylene', weight: 1.0, recyclable: true },
    PS: { code: 'PS', name: 'Polystyrene', weight: 1.5, recyclable: false },
    OTHER: {
      code: 'OTHER',
      name: 'Other Plastics',
      weight: 1.3,
      recyclable: false,
    },
  },

  // Severity scoring algorithm weights
  SEVERITY_WEIGHTS: {
    TOTAL_WASTE: 0.4, // 40% weight - volume of waste
    PLASTIC_RATIO: 0.3, // 30% weight - proportion of non-recyclable plastic
    FREQUENCY: 0.2, // 20% weight - cleanup frequency needed
    TREND: 0.1, // 10% weight - pollution trend (increasing = worse)
  },

  // Default carbon emission factor (kg CO₂ per kg of plastic)
  DEFAULT_EMISSION_FACTOR: 2.5,

  // Trend prediction configuration
  TREND_PREDICTION: {
    MIN_DATA_POINTS: 4, // Minimum records needed for prediction
    FORECAST_MONTHS: 3, // Predict 3 months ahead
    CONFIDENCE_LEVEL: 0.95, // 95% confidence interval
  },
};
