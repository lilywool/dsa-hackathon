export type GeoJsonGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type GeoJsonFeature<P> = {
  type: "Feature";
  properties: P;
  geometry: GeoJsonGeometry;
};

export type FeatureCollection<P> = {
  type: "FeatureCollection";
  features: GeoJsonFeature<P>[];
};

export type NeighborhoodHistoryPoint = { date: string; total: number };

export type NeighborhoodTrendProps = {
  neighborhood: string;
  latest_month: string;
  latest_total: number;
  history: NeighborhoodHistoryPoint[];
  crosswalk_note?: string;
};

export type BlockHistoryPoint = {
  date: string;
  individuals: number;
  tents: number;
  vehicles: number;
};

export type BlockNeedProps = {
  block_id: string;
  neighborhood: string;
  latest_count_date: string;
  latest_individuals: number;
  latest_tents: number;
  latest_vehicles: number;
  has_panel_data: boolean;
  history: BlockHistoryPoint[];
};

export type GetItDoneEncampmentProps = {
  block_id: string;
  neighborhood: string;
  total_reports: number;
  latest_year: string;
  latest_year_reports: number;
  reports_by_year: Record<string, number>;
  /** Sparse: months with no reports for this block are omitted. Missing = 0. */
  reports_by_month: Record<string, number>;
  latest_month: string;
};

export type GetItDoneEncampmentTrendYear = {
  year: number;
  downtown_total: number;
  attributed_to_block: number;
  blocks_with_reports: number;
};

export type GetItDoneEncampmentTrend = {
  note: string;
  coverage: string;
  caveats: {
    "2016_2017": string;
    "2025": string;
  };
  years: GetItDoneEncampmentTrendYear[];
};

export type ServiceLocationProps = {
  organization: string;
  org_key: string;
  services: string[];
  referral_only_services: string[];
  address: string;
  inside_downtown_boundary: boolean;
  source: string;
  coordinate_resolution_method?: string;
  coordinate_confidence?: string;
};

export type TransitStopProps = {
  stop_id: string;
  stop_name: string;
  wheelchair_boarding: number | null;
};

export type CapacityConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "MODELED_FALLBACK";

export type OrgCapacityRow = {
  org_key: string;
  organization: string;
  category: string;
  category_enum: string;
  capacity_value: number;
  capacity_unit: string;
  capacity_confidence: CapacityConfidence;
  capacity_method: string;
  metric_interpretation: string;
  capacity_source: string;
  scope: string;
  org_wide_total_flag: boolean;
};

export type OrgCapacityGeoProps = OrgCapacityRow & {
  inside_downtown_boundary?: boolean;
};

export type ForecastPoint = {
  date: string;
  value: number;
  lower: number;
  upper: number;
  kind: "history" | "forecast";
};

export type HudPitYear = {
  year: number;
  overall: number;
  sheltered: number;
  unsheltered: number;
  methodology_break: boolean;
};

export type HudPitSeries = {
  label: string;
  years: HudPitYear[];
};

export type HudPitBenchmark = {
  note: string;
  scale_warning: string;
  caveats: {
    "2021": string;
    cadence: string;
  };
  source: string;
  series: {
    san_diego_coc: HudPitSeries;
    california: HudPitSeries;
    san_diego_coc_veterans: HudPitSeries;
    california_veterans: HudPitSeries;
  };
};
