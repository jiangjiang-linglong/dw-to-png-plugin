import React, { useState, useEffect } from 'react';
import { IFieldMeta } from '@lark-base-open/js-sdk';

interface FieldWidthManagerProps {
  fields: IFieldMeta[];
  currentWidths: { [fieldId: string]: number };
  onWidthChange: (fieldId: string, width: number) => void;
  onApplyAll: (widths: { [fieldId: string]: number }) => void;
  tableData?: any;
}

const FieldWidthManager: React.FC<FieldWidthManagerProps> = ({
  fields, currentWidths, onWidthChange, onApplyAll, tableData
}) => {
  const [localWidths, setLocalWidths] = useState<{ [fieldId: string]: number }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { setLocalWidths(currentWidths); }, [currentWidths]);

  const handleWidthChange = (fieldId: string, width: string) => {
    const numWidth = parseInt(width) || 100;
    setLocalWidths(prev => ({ ...prev, [fieldId]: numWidth }));
    onWidthChange(fieldId, numWidth);
  };

  const handleReset = () => {
    const defaultWidths: { [fieldId: string]: number } = {};
    fields.forEach(field => { defaultWidths[field.id] = 120; });
    setLocalWidths(defaultWidths);
    onApplyAll(defaultWidths);
  };

  const handleAutoFit = () => {
    const autoFitWidths: { [fieldId: string]: number } = {};
    fields.forEach(field => {
      let maxContentLength = field.name.length;
      if (tableData && tableData.rows) {
        const fieldIndex = tableData.headers?.findIndex((h: any) => h.id === field.id);
        if (fieldIndex !== -1 && tableData.rows) {
          tableData.rows.forEach((row: any) => {
            const cell = row.cells[fieldIndex];
            if (cell && cell.value) {
              const contentLength = cell.value.length;
              if (contentLength > maxContentLength) maxContentLength = contentLength;
            }
          });
        }
      }
      let minWidth = 30;
      switch (field.type) {
        case 1: minWidth = 50; break; case 15: minWidth = 60; break;
        case 2: case 99003: minWidth = 40; break; case 99002: case 99004: minWidth = 40; break;
        case 5: case 1001: case 1002: minWidth = 60; break; case 7: minWidth = 30; break;
        case 11: case 1003: case 1004: case 23: minWidth = 50; break; case 13: minWidth = 50; break;
        case 99005: minWidth = 60; break; case 3: case 4: minWidth = 40; break;
        case 17: minWidth = 40; break; case 18: case 21: case 19: minWidth = 60; break;
        case 22: minWidth = 60; break; case 20: minWidth = 50; break;
        default: minWidth = 40;
      }
      const calculatedWidth = Math.min(maxContentLength * 6, 500);
      autoFitWidths[field.id] = Math.max(calculatedWidth, minWidth);
    });
    setLocalWidths(autoFitWidths);
    onApplyAll(autoFitWidths);
  };

  const handleApplyAll = () => {
    setIsLoading(true);
    onApplyAll(localWidths);
    setTimeout(() => setIsLoading(false), 500);
  };

  const getFieldTypeName = (fieldType: number): string => {
    const typeNames: Record<number, string> = {
      1: '多行文本', 2: '数字', 3: '单选', 4: '多选', 5: '日期', 7: '复选框',
      11: '人员', 13: '电话', 15: '超链接', 17: '附件', 18: '单向关联',
      19: '查找引用', 20: '公式', 21: '双向关联', 22: '地理位置', 23: '群聊',
      1001: '创建时间', 1002: '修改时间', 1003: '创建人', 1004: '修改人',
      1005: '自动编号', 99001: '二维码', 99002: '进度', 99003: '货币', 99004: '评分', 99005: '邮箱'
    };
    return typeNames[fieldType] || '未知类型';
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#495057' }}>预览输出宽度管理</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleAutoFit} style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>自动调整</button>
          <button onClick={handleReset} style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>重置默认</button>
          <button onClick={handleApplyAll} disabled={isLoading} style={{ padding: '6px 12px', backgroundColor: isLoading ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '12px' }}>{isLoading ? '应用中...' : '应用所有'}</button>
        </div>
      </div>
      <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', backgroundColor: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#e9ecef', position: 'sticky', top: 0 }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #dee2e6', fontWeight: 'bold' }}>字段名称</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #dee2e6', fontWeight: 'bold' }}>字段类型</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: 'bold', width: '120px' }}>当前宽度 (px)</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: 'bold', width: '80px' }}>预览</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                <td style={{ padding: '8px 12px', border: '1px solid #dee2e6', fontWeight: '500' }}>{field.name}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #dee2e6', color: '#6c757d' }}>{getFieldTypeName(field.type)}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                  <input type="number" min="20" max="500" value={localWidths[field.id] || 120} onChange={(e) => handleWidthChange(field.id, e.target.value)} style={{ width: '80px', padding: '4px', border: '1px solid #ced4da', borderRadius: '4px', textAlign: 'center' }} />
                </td>
                <td style={{ padding: '8px 12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                  <div style={{ width: `${Math.min(localWidths[field.id] || 120, 60)}px`, height: '20px', backgroundColor: '#007bff', borderRadius: '2px', margin: '0 auto' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '12px', fontSize: '11px', color: '#6c757d', lineHeight: '1.4' }}>
        <div>💡 提示：</div>
        <div>• 此处设置的是预览和PNG图片输出时的字段宽度</div>
        <div>• 宽度范围：20-500 像素</div>
        <div>• 一个汉字默认宽度为6px</div>
        <div>• 自动调整会根据列中所有内容的最长字符数计算宽度</div>
        <div>• 调整后会立即在预览中看到效果</div>
        <div>• 导出PNG时将使用此处设置的宽度</div>
      </div>
    </div>
  );
};

export default FieldWidthManager;
