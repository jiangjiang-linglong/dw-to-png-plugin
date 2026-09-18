import { FieldType, IOpenCellValue } from '@lark-base-open/js-sdk';
import { FieldFormatConfig } from '../types';

export const formatNumber = (value: number, format?: string): string => {
  if (typeof value !== 'number') return String(value);
  switch (format) {
    case '0.0': return value.toFixed(1);
    case '0.00': return value.toFixed(2);
    case '0.000': return value.toFixed(3);
    case '0,000': return Math.round(value).toLocaleString();
    case '0,000.00': return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case '0%': return (value * 100).toFixed(0) + '%';
    case '0.00%': return (value * 100).toFixed(2) + '%';
    default: return String(value);
  }
};

export const formatDate = (value: number, format?: string): string => {
  if (typeof value !== 'number') return String(value);
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  switch (format) {
    case 'yyyy-MM-dd': return `${year}-${month}-${day}`;
    case 'yyyy/MM/dd': return `${year}/${month}/${day}`;
    case 'MM-dd': return `${month}-${day}`;
    case 'MM/dd/yyyy': return `${month}/${day}/${year}`;
    case 'dd/MM/yyyy': return `${day}/${month}/${year}`;
    case 'yyyy-MM-dd HH:mm': return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'yyyy/MM/dd HH:mm': return `${year}/${month}/${day} ${hours}:${minutes}`;
    default: return `${year}-${month}-${day}`;
  }
};

export const formatCheckbox = (value: boolean): string => value ? '☑' : '☐';
export const formatSingleSelect = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'object' && 'text' in value && value.text) return (value as any).text;
  return String(value);
};
export const formatMultiSelect = (value: any[]): string => {
  if (!Array.isArray(value)) return '';
  return value.map(item => (typeof item === 'object' && item.text) ? item.text : String(item)).join(', ');
};
export const formatUser = (value: any): string => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.map(user => (typeof user === 'object' && user.name) ? user.name : String(user)).join(', ');
  }
  if (typeof value === 'object' && value.name) return value.name;
  return String(value);
};
export const formatAttachment = (value: any[]): string => {
  if (!Array.isArray(value)) return '';
  return value.map(att => (typeof att === 'object' && att.name) ? att.name : String(att)).join(', ');
};
export const formatLink = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'object' && value.text) return value.text;
  return String(value);
};
export const formatLocation = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'object' && value.address) return value.address;
  return String(value);
};

export const formatCellValue = (
  value: IOpenCellValue,
  fieldType: FieldType,
  format?: FieldFormatConfig
): string => {
  if (value === null || value === undefined) return '';

  switch (fieldType) {
    case FieldType.Text:
      if (Array.isArray(value)) {
        return value.map(segment => (typeof segment === 'object' && 'text' in segment && segment.text) ? segment.text : String(segment)).join('');
      }
      return String(value);

    case FieldType.Number:
      const formatter = format?.numberFormat || '0.00';
      return formatNumber(value as number, formatter);

    case FieldType.DateTime:
    case FieldType.CreatedTime:
    case FieldType.ModifiedTime:
      return formatDate(value as number, format?.dateFormat);

    case FieldType.Checkbox:
      return formatCheckbox(value as boolean);

    case FieldType.SingleSelect:
      return formatSingleSelect(value);

    case FieldType.MultiSelect:
      return formatMultiSelect(value as any[]);

    case FieldType.User:
    case FieldType.CreatedUser:
    case FieldType.ModifiedUser:
      return formatUser(value);

    case FieldType.Attachment:
      return formatAttachment(value as any[]);

    case FieldType.SingleLink:
    case FieldType.DuplexLink:
    case FieldType.Lookup:
      return formatLink(value);

    case FieldType.Location:
      return formatLocation(value);

    case FieldType.Phone:
      return String(value);

    case FieldType.Url:
      if (Array.isArray(value)) {
        return value.map(item => (typeof item === 'object' && 'link' in item) ? (item as any).link : String(item)).join(', ');
      }
      return String(value);

    case FieldType.Email:
      return String(value);

    case FieldType.Barcode:
      return String(value);

    case FieldType.AutoNumber:
      if (typeof value === 'object' && value !== null) return (value as any).value || '';
      return String(value);

    case FieldType.Progress:
      return typeof value === 'number' ? `${Math.round(value * 100)}%` : String(value);

    case FieldType.Currency:
      const currencyFormatter = format?.numberFormat || '0.00';
      return formatNumber(value as number, currencyFormatter);

    case FieldType.Rating:
      return typeof value === 'number' ? '★'.repeat(value) : String(value);

    case FieldType.GroupChat:
      return String(value);

    case FieldType.Formula:
      if (typeof value === 'number') {
        const formulaFormatter = format?.numberFormat || '0.00';
        return formatNumber(value, formulaFormatter);
      } else if (typeof value === 'boolean') {
        return formatCheckbox(value);
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && 'text' in value[0]) {
          return formatMultiSelect(value);
        }
        return value.map(v => String(v)).join(', ');
      }
      return String(value);

    default:
      return String(value);
  }
};

export const getFieldDisplayName = (
  fieldName: string,
  fieldType: FieldType,
  showType: boolean = false
): string => {
  if (!showType) return fieldName;
  const typeNames: { [key: number]: string } = {
    [FieldType.Text]: '多行文本', [FieldType.Number]: '数字', [FieldType.SingleSelect]: '单选',
    [FieldType.MultiSelect]: '多选', [FieldType.DateTime]: '日期', [FieldType.Checkbox]: '复选框',
    [FieldType.User]: '人员', [FieldType.Phone]: '电话', [FieldType.Url]: '超链接',
    [FieldType.Attachment]: '附件', [FieldType.SingleLink]: '单向关联', [FieldType.Lookup]: '查找引用',
    [FieldType.Formula]: '公式', [FieldType.DuplexLink]: '双向关联', [FieldType.Location]: '地理位置',
    [FieldType.GroupChat]: '群聊', [FieldType.CreatedTime]: '创建时间', [FieldType.ModifiedTime]: '修改时间',
    [FieldType.CreatedUser]: '创建人', [FieldType.ModifiedUser]: '修改人', [FieldType.AutoNumber]: '自动编号',
    [FieldType.Barcode]: '二维码', [FieldType.Progress]: '进度', [FieldType.Currency]: '货币',
    [FieldType.Rating]: '评分', [FieldType.Email]: '邮箱'
  };
  const typeName = typeNames[fieldType] || '未知类型';
  return `${fieldName} (${typeName})`;
};

export const applyFieldFormat = (element: HTMLElement, format: FieldFormatConfig): void => {
  if (format.fontSize) element.style.fontSize = `${format.fontSize}px`;
  if (format.fontWeight) element.style.fontWeight = format.fontWeight;
  if (format.color) element.style.color = format.color;
  if (format.backgroundColor) element.style.backgroundColor = format.backgroundColor;
  if (format.textAlign) element.style.textAlign = format.textAlign;
  if (format.padding) element.style.padding = `${format.padding}px`;
  if (format.border) element.style.border = `1px solid ${format.borderColor || '#d9d9d9'}`;
  else element.style.border = 'none';
};

export const getDefaultFieldFormat = (fieldType: FieldType): Partial<FieldFormatConfig> => {
  const baseFormat = {
    fontSize: 12, fontWeight: 'normal' as const, color: '#000000', backgroundColor: '#ffffff',
    textAlign: 'left' as const, padding: 8, border: true, borderColor: '#d9d9d9', showFieldType: false
  };
  switch (fieldType) {
    case FieldType.Number:
    case FieldType.Currency:
    case FieldType.Progress:
    case FieldType.Rating:
      return { ...baseFormat, textAlign: 'right', numberFormat: '0.00' };
    case FieldType.DateTime:
    case FieldType.CreatedTime:
    case FieldType.ModifiedTime:
      return { ...baseFormat, textAlign: 'center', dateFormat: 'yyyy-MM-dd' };
    case FieldType.Checkbox:
      return { ...baseFormat, textAlign: 'center' };
    default:
      return baseFormat;
  }
};

export const needsTwoDecimalFormat = (fieldName: string): boolean => {
  const specialFields = ['成材率', '非定尺率', '负公差'];
  return specialFields.some(field => fieldName.includes(field));
};

export const formatToTwoDecimals = (value: any): string => {
  if (typeof value === 'number') return value.toFixed(2);
  const numValue = parseFloat(String(value));
  if (!isNaN(numValue)) return numValue.toFixed(2);
  return String(value);
};
