export interface B2CRawRow {
    [key: string]: string;
}

export interface B2CProcessedRow {
    wbn: string;
    sd_dif: number;
    large: boolean;
    aging_bucket: string;
    producttype: string;
    status: string;
    ndc: string;
    facility: string;
}

export interface B2CAnalysisResult {
    summary: {
        totalWBNs: number;
        ageBreakdown: { [key: string]: number };
        productBreakdown: { [key: string]: number };
        statusBreakdown: { [key: string]: number };
    };
    ndcSummary: { ndc: string; total_ageing_wbns: number; age_gt_96: number }[];
    detailedWBNs: B2CProcessedRow[];
}

export interface B2BRawRow {
    [key: string]: string;
}

export interface B2BProcessedRow {
    wbn: string;
    facility: string;
    controllable_remark: string;
    sub_remark: string;
    put_remarks: string;
    ntc: string;
    client: string;
    cs_sr: string;
    not_put_wbns: string;
    ageing_days: number;
    ageing_bucket_hrs: string;
    remark_combined: string;
    put_combined: string;
}

export interface B2BAnalysisResult {
    summary: {
        totalWBNs: number;
        controllableBreakdown: { controllable_remark: string; sub_remark: string; count: number }[];
        ageingBreakdown: { [key: string]: number };
        putBreakdown: { [key: string]: number };
    };
    ntcSummary: { ntc: string; total_wbns: number; age_gt_96: number }[];
    clientSummary: { client: string; total_wbns: number; age_gt_96: number }[];
    detailedWBNs: B2BProcessedRow[];
}

export type AnalysisResult = B2CAnalysisResult | B2BAnalysisResult;

export type SortOrder = 'asc' | 'desc';

export interface SortConfig<T> {
    key: keyof T;
    order: SortOrder;
}
