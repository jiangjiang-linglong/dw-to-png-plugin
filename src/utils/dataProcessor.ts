import { FieldType, IFieldMeta, IRecord, IOpenCellValue, IOpenUser, IOpenAttachment, IOpenSingleSelect, IOpenMultiSelect, IOpenLocation, IOpenLink } from '@lark-base-open/js-sdk';
import { ProcessedCellData, TableRenderData, FieldFormatConfig } from '../types';
import { needsTwoDecimalFormat, formatToTwoDecimals, formatCellValue } from './fieldFormatter';

export function processCellValue(value: IOpenCellValue, fieldType: FieldType, formatter?: string): string {
  if (value === null || value === undefined) return '';

  switch (fieldType) {
    case FieldType.Text:
      if (Array.isArray(value)) {
        return (value as any[]).map(item => item.text || '').join('');
      }
      return String(value);

    case FieldType.Number:
      if (typeof value === 'number') {
        let result: string;
        const localizedStr = value.toLocaleString('zh-CN', { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: 20 });
        if (formatter && typeof value === 'number') {
          const decimalPlaces = parseInt(formatter.split('.')[1] || '0');
          result = value.toFixed(decimalPlaces);
        } else {
          result = localizedStr;
        }
        return result;
      }
      return String(value);

    case FieldType.SingleSelect:
      const singleSelect = value as IOpenSingleSelect;
      return singleSelect?.text || '';

    case FieldType.MultiSelect:
      const multiSelect = value as IOpenMultiSelect;
      return multiSelect?.map(item => item.text).join(', ') || '';

    case FieldType.DateTime:
      return String(value);

    case FieldType.Checkbox:
      return value ? '✓' : '✗';

    case FieldType.User:
      const users = value as IOpenUser[];
      return users?.map(user => user.name || user.enName || '').join(', ') || '';

    case FieldType.Phone:
      return String(value);

    case FieldType.Url:
      if (Array.isArray(value)) {
        return (value as any[]).map(item => item.link || item.text || '').join(', ');
      }
      return String(value);

    case FieldType.Attachment:
      const attachments = value as IOpenAttachment[];
      return attachments?.map(att => att.name).join(', ') || '';

    case FieldType.SingleLink:
    case FieldType.DuplexLink:
      const link = value as IOpenLink;
      return link?.text || '';

    case FieldType.Location:
      const location = value as IOpenLocation;
      return location?.fullAddress || location?.address || '';

    case FieldType.Currency:
      return typeof value === 'number' ? String(value) : String(value);

    case FieldType.Progress:
      return typeof value === 'number' ? String(value) : String(value);

    case FieldType.Rating:
      return typeof value === 'number' ? '★'.repeat(value) : String(value);

    case FieldType.Email:
      return String(value);

    case FieldType.AutoNumber:
      if (typeof value === 'object' && value !== null) {
        return (value as any).value || '';
      }
      return String(value);

    case FieldType.Formula:
      if (Array.isArray(value)) {
        return value.map(item => {
          if (typeof item === 'object' && item !== null) return (item as any).text || '';
          return String(item);
        }).join('');
      }
      return String(value);

    default:
      return String(value);
  }
}

export function processTableData(
  fields: IFieldMeta[],
  records: IRecord[],
  excludedFieldTypes: number[] = [],
  viewColumnWidths?: { [fieldId: string]: number },
  groupInfo?: Array<{ fieldId: string; desc: boolean }>
): TableRenderData {
  const filteredFields = fields.filter(field => !excludedFieldTypes.includes(field.type));

  const headers = filteredFields.map(field => ({
    id: field.id,
    name: field.name,
    type: field.type,
    width: viewColumnWidths?.[field.id],
    property: field.property
  }));

  const rows = records.map(record => {
    const cells = headers.map(header => {
      const cellValue = record.fields[header.id];
      const field = filteredFields.find(f => f.id === header.id);
      if (!field) {
        return { value: String(cellValue || ''), type: header.type, originalValue: cellValue, fieldMeta: field } as ProcessedCellData;
      }

      const formatConfig: FieldFormatConfig = {
        fontSize: 12, fontWeight: 'normal', color: '#000000', backgroundColor: '#ffffff',
        textAlign: 'left', padding: 8, border: true, borderColor: '#d9d9d9'
      };

      switch (header.type) {
        case FieldType.Number:
        case FieldType.Currency:
        case FieldType.Progress:
          formatConfig.numberFormat = (field.property as any)?.formatter || '0.00';
          break;
        case FieldType.DateTime:
        case FieldType.CreatedTime:
        case FieldType.ModifiedTime:
          formatConfig.dateFormat = (field.property as any)?.date_format || 'yyyy-MM-dd';
          break;
      }

      let processedValue = formatCellValue(cellValue, header.type, formatConfig);

      if ([FieldType.Number, FieldType.Currency, FieldType.Progress].includes(header.type) &&
          !((field.property as any)?.formatter) &&
          needsTwoDecimalFormat(header.name)) {
        processedValue = formatToTwoDecimals(cellValue);
      }

      return { value: processedValue, type: header.type, originalValue: cellValue, fieldMeta: field } as ProcessedCellData;
    });

    return { recordId: record.recordId, cells };
  });

  return { headers, rows, groupInfo };
}

export function getFieldFilterOptions(): Array<{type: number, name: string}> {
  return [
    { type: 1, name: '多行文本' }, { type: 2, name: '数字' }, { type: 3, name: '单选' },
    { type: 4, name: '多选' }, { type: 5, name: '日期' }, { type: 7, name: '复选框' },
    { type: 11, name: '人员' }, { type: 13, name: '电话' }, { type: 15, name: '超链接' },
    { type: 17, name: '附件' }, { type: 18, name: '单向关联' }, { type: 21, name: '双向关联' },
    { type: 22, name: '地理位置' }, { type: 99003, name: '货币' }, { type: 99002, name: '进度' },
    { type: 99004, name: '评分' }, { type: 99005, name: '邮箱' }, { type: 1005, name: '自动编号' },
    { type: 20, name: '公式' }, { type: 1001, name: '创建时间' }, { type: 1002, name: '修改时间' },
    { type: 1003, name: '创建人' }, { type: 1004, name: '修改人' }, { type: 19, name: '查找引用' },
    { type: 99001, name: '二维码' }, { type: 23, name: '群聊' }
  ];
}

export function getFieldTypeName(fieldType: FieldType): string {
  const typeNames: Record<number, string> = {
    1: '多行文本', 2: '数字', 3: '单选', 4: '多选', 5: '日期', 7: '复选框',
    11: '人员', 13: '电话', 15: '超链接', 17: '附件', 18: '单向关联',
    21: '双向关联', 22: '地理位置', 99003: '货币', 99002: '进度', 99004: '评分',
    99005: '邮箱', 1005: '自动编号', 20: '公式', 1001: '创建时间', 1002: '修改时间',
    1003: '创建人', 1004: '修改人', 19: '查找引用', 99001: '二维码', 23: '群聊'
  };
  return typeNames[fieldType] || '未知类型';
}
