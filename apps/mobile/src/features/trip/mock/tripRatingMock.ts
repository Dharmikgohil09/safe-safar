export const RATING_OPTIONS = ['Felt safe', 'Okay', 'Felt unsafe'] as const;

export type RatingOption = typeof RATING_OPTIONS[number];

export const SAMPLE_TRIP_SUMMARY = 'SVNIT to Adajan, 25 min';
