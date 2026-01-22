export interface MetricStats {
  approved?: number;
  completed?: number;
  confirmed?: number;
  uploaded?: number;
  total: number;
  ratio: number;
}

export interface ServiceLineMonitoringStats {
  serviceLine: string;
  serviceLineName: string;
  description: string;
  clientAcceptance: MetricStats;
  engagementAcceptance: MetricStats;
  independenceConfirmations: MetricStats;
  engagementLetters: MetricStats;
  dpaDocuments: MetricStats;
}

export interface QRMMonitoringStats {
  firmWide: {
    clientAcceptance: MetricStats;
    engagementAcceptance: MetricStats;
    independenceConfirmations: MetricStats;
    engagementLetters: MetricStats;
    dpaDocuments: MetricStats;
  };
  byServiceLine: ServiceLineMonitoringStats[];
}
