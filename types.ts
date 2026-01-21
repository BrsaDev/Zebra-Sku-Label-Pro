
export interface LabelData {
  sku: string;
  barcode: string;
  count: number;
}

export interface LabelConfig {
  width: number;
  height: number;
  columns: number;
}

export const ZEBRA_LABEL_CONFIG: LabelConfig = {
  width: 40,
  height: 25,
  columns: 2
};
