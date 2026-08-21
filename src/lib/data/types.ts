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
