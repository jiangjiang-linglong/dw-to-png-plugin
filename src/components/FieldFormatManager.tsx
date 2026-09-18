import React, { useState, useEffect } from 'react';
import { IFieldMeta, FieldType } from '@lark-base-open/js-sdk';

interface FieldFormatConfig {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  padding: number;
  border: boolean;
  borderColor: string;
  dateFormat?: string;
  numberFormat?: string;
  showFieldType: boolean;
}

interface FieldFormatManagerProps {
  fields: IFieldMeta[];
  onFormatChange: (fieldId: string, format: FieldFormatConfig) => void;
  currentFormats?: { [fieldId: string]: FieldFormatConfig };
}

const FieldFormatManager: React.FC<FieldFormatManagerProps> = ({
  fields,
  onFormatChange,
  currentFormats = {}
}) => {
  const [formats, setFormats] = useState<{ [fieldId: string]: FieldFormatConfig }>({});

  useEffect(() => {
    const defaultFormats: { [fieldId: string]: FieldFormatConfig } = {};
    fields.forEach(field => {
      defaultFormats[field.id] = currentFormats[field.id] || {
        fontSize: 12, fontWeight: 'normal', color: '#000000', backgroundColor: '#ffffff',
        textAlign: 'left', padding: 8, border: true, borderColor: '#d9d9d9', showFieldType: false,
        ...(field.type === FieldType.Number && { numberFormat: '0' }),
        ...(field.type === FieldType.DateTime && { dateFormat: 'yyyy-MM-dd' })
      };
    });
    setFormats(defaultFormats);
  }, [fields, currentFormats]);

  const handleFormatChange = (fieldId: string, formatKey: keyof FieldFormatConfig, value: any) => {
    const newFormats = { ...formats, [fieldId]: { ...formats[fieldId], [formatKey]: value } };
    setFormats(newFormats);
    onFormatChange(fieldId, newFormats[fieldId]);
  };

  const handleResetField = (fieldId: string) => {
    const defaultFormat: FieldFormatConfig = {
      fontSize: 12, fontWeight: 'normal', color: '#000000', backgroundColor: '#ffffff',
      textAlign: 'left', padding: 8, border: true, borderColor: '#d9d9d9', showFieldType: false
    };
    const newFormats = { ...formats, [fieldId]: defaultFormat };
    setFormats(newFormats);
    onFormatChange(fieldId, defaultFormat);
  };

  const handleApplyToAll = (format: Partial<FieldFormatConfig>) => {
    const newFormats: { [fieldId: string]: FieldFormatConfig } = {};
    fields.forEach(field => { newFormats[field.id] = { ...formats[field.id], ...format }; });
    setFormats(newFormats);
    Object.entries(newFormats).forEach(([fieldId, format]) => { onFormatChange(fieldId, format); });
  };

  const getFieldTypeName = (fieldType: number): string => {
    const typeNames: Record<number, string> = {
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
    return typeNames[fieldType] || '未知类型';
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#495057' }}>字段格式管理</h3>
      </div>
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #dee2e6' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>全局设置</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>字体大小</label>
            <input type="number" min="8" max="24" value={12} onChange={(e) => handleApplyToAll({ fontSize: parseInt(e.target.value) })} style={{ width: '100%', padding: '4px 8px', border: '1px solid #ced4da', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>文字颜色</label>
            <input type="color" value="#000000" onChange={(e) => handleApplyToAll({ color: e.target.value })} style={{ width: '100%', height: '32px', border: '1px solid #ced4da', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>背景颜色</label>
            <input type="color" value="#ffffff" onChange={(e) => handleApplyToAll({ backgroundColor: e.target.value })} style={{ width: '100%', height: '32px', border: '1px solid #ced4da', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>边框</label>
            <select onChange={(e) => handleApplyToAll({ border: e.target.value === 'true', borderColor: '#d9d9d9' })} style={{ width: '100%', padding: '4px 8px', border: '1px solid #ced4da', borderRadius: '4px' }}>
              <option value="true">显示</option>
              <option value="false">隐藏</option>
            </select>
          </div>
        </div>
      </div>
      <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', backgroundColor: 'white' }}>
        {fields.map((field, index) => (
          <div key={field.id} style={{ padding: '12px', borderBottom: index < fields.length - 1 ? '1px solid #dee2e6' : 'none', backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#495057' }}>{field.name}</span>
                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6c757d', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>{getFieldTypeName(field.type)}</span>
              </div>
              <button onClick={() => handleResetField(field.id)} style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>重置</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '12px' }}>
              <div><label style={{ display: 'block', marginBottom: '2px' }}>字体大小</label><input type="number" min="8" max="24" value={formats[field.id]?.fontSize || 12} onChange={(e) => handleFormatChange(field.id, 'fontSize', parseInt(e.target.value))} style={{ width: '100%', padding: '2px 4px', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '11px' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '2px' }}>字体粗细</label><select value={formats[field.id]?.fontWeight || 'normal'} onChange={(e) => handleFormatChange(field.id, 'fontWeight', e.target.value)} style={{ width: '100%', padding: '2px 4px', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '11px' }}><option value="normal">正常</option><option value="bold">粗体</option></select></div>
              <div><label style={{ display: 'block', marginBottom: '2px' }}>文字颜色</label><input type="color" value={formats[field.id]?.color || '#000000'} onChange={(e) => handleFormatChange(field.id, 'color', e.target.value)} style={{ width: '100%', height: '24px', border: '1px solid #ced4da', borderRadius: '3px' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '2px' }}>背景颜色</label><input type="color" value={formats[field.id]?.backgroundColor || '#ffffff'} onChange={(e) => handleFormatChange(field.id, 'backgroundColor', e.target.value)} style={{ width: '100%', height: '24px', border: '1px solid #ced4da', borderRadius: '3px' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '2px' }}>对齐方式</label><select value={formats[field.id]?.textAlign || 'left'} onChange={(e) => handleFormatChange(field.id, 'textAlign', e.target.value)} style={{ width: '100%', padding: '2px 4px', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '11px' }}><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></div>
              <div><label style={{ display: 'block', marginBottom: '2px' }}>边框</label><select value={formats[field.id]?.border ? 'true' : 'false'} onChange={(e) => handleFormatChange(field.id, 'border', e.target.value === 'true')} style={{ width: '100%', padding: '2px 4px', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '11px' }}><option value="true">显示</option><option value="false">隐藏</option></select></div>
              <div><label style={{ display: 'block', marginBottom: '2px' }}>显示字段类型</label><select value={formats[field.id]?.showFieldType ? 'true' : 'false'} onChange={(e) => handleFormatChange(field.id, 'showFieldType', e.target.value === 'true')} style={{ width: '100%', padding: '2px 4px', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '11px' }}><option value="false">隐藏</option><option value="true">显示</option></select></div>
            </div>
            {field.type === FieldType.Number && (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e7f3ff', borderRadius: '4px', fontSize: '11px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>数字格式</label>
                <select value={formats[field.id]?.numberFormat || '0'} onChange={(e) => handleFormatChange(field.id, 'numberFormat', e.target.value)} style={{ width: '100%', padding: '2px 4px', border: '1px solid #b3d9ff', borderRadius: '3px', fontSize: '11px' }}>
                  <option value="0">整数</option><option value="0.0">一位小数</option><option value="0.00">两位小数</option><option value="0.000">三位小数</option><option value="0,000">千位分隔符</option><option value="0,000.00">千位分隔符+小数</option><option value="0%">百分比</option><option value="0.00%">百分比(小数)</option>
                </select>
              </div>
            )}
            {field.type === FieldType.DateTime && (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff4e6', borderRadius: '4px', fontSize: '11px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>日期格式</label>
                <select value={formats[field.id]?.dateFormat || 'yyyy-MM-dd'} onChange={(e) => handleFormatChange(field.id, 'dateFormat', e.target.value)} style={{ width: '100%', padding: '2px 4px', border: '1px solid #ffd591', borderRadius: '3px', fontSize: '11px' }}>
                  <option value="yyyy-MM-dd">2024-01-01</option><option value="yyyy/MM/dd">2024/01/01</option><option value="MM-dd">01-01</option><option value="MM/dd/yyyy">01/01/2024</option><option value="dd/MM/yyyy">01/01/2024</option><option value="yyyy-MM-dd HH:mm">2024-01-01 12:00</option><option value="yyyy/MM/dd HH:mm">2024/01/01 12:00</option>
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px', fontSize: '11px', color: '#6c757d', lineHeight: '1.4' }}>
        <div>💡 提示：</div>
        <div>• 此处设置的是字段在PNG图片输出时的显示格式</div>
        <div>• 可以单独设置每个字段的格式，也可以使用全局设置批量调整</div>
        <div>• 数字和日期字段支持特殊的格式化选项</div>
        <div>• 格式设置会立即在预览中生效</div>
      </div>
    </div>
  );
};

export default FieldFormatManager;
