import { FieldType, IFieldMeta, IRecord, IOpenCellValue } from '@lark-base-open/js-sdk';

export interface TableData {
  fields: IFieldMeta[];
  records: IRecord[];
  tableName: string;
}

export interface ProcessedCellData {
  value: string;
  type: FieldType;
  originalValue: IOpenCellValue;
  formatter?: string; // 格式化器
  fieldMeta?: IFieldMeta; // 字段元数据
}

export interface TableRenderData {
  headers: Array<{
    id: string;
    name: string;
    type: FieldType;
    width?: number; // 视图中的列宽
  }>;
  rows: Array<{
    recordId: string;
    cells: ProcessedCellData[];
  }>;
  groupInfo?: Array<{
    fieldId: string;
    desc: boolean;
  }>; // 分组信息
}

export type ComparisonOperator = 'eq' | 'gt' | 'gte' | 'lt' | 'lte';

export interface ColumnComparisonRule {
  id: string;
  compareColumn: string; // 比较项列（参考列）的fieldId
  targetColumn: string; // 目标列（被标记列）的fieldId
  operator: ComparisonOperator; // 比较运算符
}

export interface ExportOptions {
  includeHeaders: boolean;
  maxRows?: number;
  cellWidth?: number;
  cellHeight?: number;
  fontSize?: number;
  theme?: 'light' | 'dark';
  excludedFieldTypes?: number[]; // 排除的字段类型数组
  includeFieldTypes?: boolean; // 是否在表头中显示字段类型
  comparisonRules?: ColumnComparisonRule[]; // 列比较规则
}

export interface FieldFormatConfig {
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  padding?: number;
  border?: boolean;
  borderColor?: string;
  numberFormat?: string;
  dateFormat?: string;
  showFieldType?: boolean;
}

export interface FieldFilterOption {
  type: number;
  name: string;
  excluded: boolean;
}
