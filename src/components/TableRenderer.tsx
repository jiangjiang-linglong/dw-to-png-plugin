import React, { useState, useEffect, useRef } from 'react';
import { TableRenderData, ExportOptions, ColumnComparisonRule, ComparisonOperator } from '../types';
import { FieldType } from '@lark-base-open/js-sdk';
import { exportRulesToFile, importRulesFromFile } from '../utils/ruleExporter';

interface TableRendererProps {
  data: TableRenderData;
  options: ExportOptions;
  onExport: () => void;
  onAddToTable: () => void;
  onOptionsChange: (options: ExportOptions) => void;
  allFieldTypes: Array<{type: number, name: string}>;
  customColumnWidths?: { [fieldId: string]: number };
  onColumnWidthChange?: (fieldId: string, width: number) => void;
  configLoaded: boolean;
  lastSavedTime: string | null;
  onClearConfig: () => void;
  tables: Array<{ id: string; name: string }>;
  selectedTableId: string | undefined;
  setSelectedTableId: (value: string | undefined) => void;
  tablesLoaded: boolean;
  isAddingToTable?: boolean;
  onGeneratePayslips: (selectedRecordIds?: string[], selectedFieldIds?: string[]) => void;
  isGeneratingPayslips?: boolean;
  payslipProgress?: { current: number; total: number } | null;
  attachmentFields: Array<{ id: string; name: string }>;
  selectedAttachmentFieldId: string;
  onAttachmentFieldChange: (fieldId: string) => void;
}

const TableRenderer: React.FC<TableRendererProps> = ({
  data, options, onExport, onAddToTable, onOptionsChange, allFieldTypes,
  customColumnWidths, configLoaded, lastSavedTime, onClearConfig,
  tables, selectedTableId, setSelectedTableId, tablesLoaded, isAddingToTable = false,
  onGeneratePayslips, isGeneratingPayslips = false, payslipProgress = null,
  attachmentFields = [], selectedAttachmentFieldId = '', onAttachmentFieldChange,
}) => {
  const [showFieldFilter, setShowFieldFilter] = useState(false);
  const [tempExcludedTypes, setTempExcludedTypes] = useState<number[]>(options.excludedFieldTypes || []);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const tableRef = useRef<HTMLTableElement>(null);

  const [comparisonRules, setComparisonRules] = useState<ColumnComparisonRule[]>(options.comparisonRules || []);
  const [showComparisonSettings, setShowComparisonSettings] = useState(false);
  const [matchingCells, setMatchingCells] = useState<Set<string>>(new Set());

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [exportSelectedOnly, setExportSelectedOnly] = useState(false);

  const [selectedPayslipFields, setSelectedPayslipFields] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSelectedRows(new Set()); }, [data]);

  useEffect(() => {
    if (data.headers.length > 0 && selectedPayslipFields.size === 0) {
      setSelectedPayslipFields(new Set(data.headers.map(h => h.id)));
    }
  }, [data]);

  useEffect(() => {
    if (options.comparisonRules) setComparisonRules(options.comparisonRules);
  }, [options.comparisonRules]);

  const handleExportRules = () => { exportRulesToFile(comparisonRules, 'comparison-rules'); };
  const handleImportRulesClick = () => { fileInputRef.current?.click(); };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importRulesFromFile(file, (rules) => {
        if (rules) {
          setComparisonRules(rules);
          onOptionsChange({ ...options, comparisonRules: rules });
        } else {
          alert('导入规则失败，请检查文件格式是否正确');
        }
      });
      event.target.value = '';
    }
  };

  const operatorDisplay: Record<ComparisonOperator, string> = {
    eq: '等于', gt: '大于', gte: '大于等于', lt: '小于', lte: '小于等于'
  };

  const getCurrentTableColumnWidths = (): number[] => {
    if (!tableRef.current) return [];
    const headers = tableRef.current.querySelectorAll('thead th');
    const widths: number[] = [];
    headers.forEach((header) => {
      const computedStyle = window.getComputedStyle(header);
      widths.push(parseFloat(computedStyle.width));
    });
    return widths;
  };

  useEffect(() => {
    if (!data || !data.headers.length) return;
    if (customColumnWidths) {
      const customWidths = data.headers.map(header => {
        const customWidth = customColumnWidths[header.id];
        return customWidth && customWidth > 0 ? customWidth : undefined;
      });
      if (customWidths.every(width => width !== undefined)) {
        setColumnWidths(customWidths as number[]);
        return;
      }
    }
    const viewWidths = data.headers.map(header => header.width).filter(width => width !== undefined) as number[];
    if (viewWidths.length === data.headers.length && viewWidths.every(width => width > 0)) {
      setColumnWidths(viewWidths);
    } else {
      const timer = setTimeout(() => {
        const actualWidths = getCurrentTableColumnWidths();
        if (actualWidths.length > 0) setColumnWidths(actualWidths);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data, customColumnWidths]);

  const compareValues = (value1: string, value2: string, operator: ComparisonOperator): boolean => {
    const num1 = parseFloat(value1);
    const num2 = parseFloat(value2);
    if (!isNaN(num1) && !isNaN(num2)) {
      switch (operator) {
        case 'eq': return num1 === num2;
        case 'gt': return num1 > num2;
        case 'gte': return num1 >= num2;
        case 'lt': return num1 < num2;
        case 'lte': return num1 <= num2;
      }
    }
    switch (operator) {
      case 'eq': return value1 === value2;
      case 'gt': return value1 > value2;
      case 'gte': return value1 >= value2;
      case 'lt': return value1 < value2;
      case 'lte': return value1 <= value2;
    }
  };

  const applyComparisonRules = () => {
    const matches = new Set<string>();
    if (!comparisonRules || comparisonRules.length === 0) {
      setMatchingCells(matches);
      return;
    }
    comparisonRules.forEach(rule => {
      const compareColIndex = data.headers.findIndex(h => h.id === rule.compareColumn);
      const targetColIndex = data.headers.findIndex(h => h.id === rule.targetColumn);
      if (compareColIndex === -1 || targetColIndex === -1) return;
      data.rows.forEach((row, rowIndex) => {
        if (rowIndex >= (options.maxRows || data.rows.length)) return;
        const compareCell = row.cells[compareColIndex];
        const targetCell = row.cells[targetColIndex];
        if (compareCell && targetCell) {
          if (compareValues(targetCell.value, compareCell.value, rule.operator)) {
            matches.add(`${rowIndex}-${targetColIndex}`);
          }
        }
      });
    });
    setMatchingCells(matches);
  };

  useEffect(() => { applyComparisonRules(); }, [data, comparisonRules, options.maxRows]);

  const addComparisonRule = () => {
    const newRule: ColumnComparisonRule = {
      id: `rule-${Date.now()}`,
      compareColumn: data.headers[0]?.id || '',
      targetColumn: data.headers[1]?.id || (data.headers[0]?.id || ''),
      operator: 'eq'
    };
    const updatedRules = [...comparisonRules, newRule];
    setComparisonRules(updatedRules);
    onOptionsChange({ ...options, comparisonRules: updatedRules });
  };

  const updateComparisonRule = (id: string, updates: Partial<ColumnComparisonRule>) => {
    const updatedRules = comparisonRules.map(rule => rule.id === id ? { ...rule, ...updates } : rule);
    setComparisonRules(updatedRules);
    onOptionsChange({ ...options, comparisonRules: updatedRules });
  };

  const deleteComparisonRule = (id: string) => {
    const updatedRules = comparisonRules.filter(rule => rule.id !== id);
    setComparisonRules(updatedRules);
    onOptionsChange({ ...options, comparisonRules: updatedRules });
  };

  const handleSelectAll = () => {
    const visibleRows = data.rows.slice(0, options.maxRows || data.rows.length);
    if (selectedRows.size >= visibleRows.length && visibleRows.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(visibleRows.map(r => r.recordId)));
    }
  };

  const handleRowSelect = (recordId: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  const handlePayslipFieldToggle = (fieldId: string) => {
    setSelectedPayslipFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  };

  const handleSelectAllPayslipFields = () => {
    if (selectedPayslipFields.size >= data.headers.length) {
      setSelectedPayslipFields(new Set());
    } else {
      setSelectedPayslipFields(new Set(data.headers.map(h => h.id)));
    }
  };

  const handleFieldFilterToggle = (fieldType: number) => {
    setTempExcludedTypes(prev =>
      prev.includes(fieldType) ? prev.filter(type => type !== fieldType) : [...prev, fieldType]
    );
  };

  const applyFieldFilter = () => {
    onOptionsChange({ ...options, excludedFieldTypes: tempExcludedTypes });
    setShowFieldFilter(false);
  };

  const resetFieldFilter = () => {
    setTempExcludedTypes([]);
    onOptionsChange({ ...options, excludedFieldTypes: [] });
  };

  const getCellAlignment = (): React.CSSProperties => ({ textAlign: 'center' as const });

  const getCellBackgroundColor = (type: FieldType, value: string): string => {
    if (type === FieldType.Checkbox) {
      return value === '✓' ? '#f0f9ff' : value === '✗' ? '#fef2f2' : 'transparent';
    }
    if (type === FieldType.Progress && value) {
      const progress = parseInt(value.replace('%', ''));
      if (progress >= 80) return '#f0f9ff';
      if (progress >= 50) return '#fef3c7';
      return '#fef2f2';
    }
    return 'transparent';
  };

  return (
    <div style={{
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: options.fontSize || 12,
      backgroundColor: options.theme === 'dark' ? '#1f1f1f' : '#ffffff',
      color: options.theme === 'dark' ? '#ffffff' : '#000000'
    }}>
      {/* 工资条生成区域 */}
      <div style={{
        marginBottom: '16px', padding: '14px',
        backgroundColor: options.theme === 'dark' ? '#2a1f3d' : '#f9f0ff',
        borderRadius: '8px', border: `2px solid ${options.theme === 'dark' ? '#722ed1' : '#d3adf7'}`
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 'bold', color: '#722ed1' }}>
          📋 工资条生成
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', minWidth: '80px' }}>存入字段:</label>
          <select value={selectedAttachmentFieldId} onChange={(e) => onAttachmentFieldChange(e.target.value)}
            disabled={isGeneratingPayslips}
            style={{
              padding: '8px 12px', border: `1px solid ${options.theme === 'dark' ? '#666' : '#ccc'}`,
              borderRadius: '4px', backgroundColor: options.theme === 'dark' ? '#333' : '#fff',
              color: options.theme === 'dark' ? '#fff' : '#000', fontSize: '13px', minWidth: '200px',
              cursor: isGeneratingPayslips ? 'not-allowed' : 'pointer'
            }}>
            {attachmentFields.length === 0 ? <option value="">暂无附件字段，请先创建</option> :
              attachmentFields.map(field => <option key={field.id} value={field.id}>{field.name}</option>)}
          </select>
          {attachmentFields.length === 0 && (
            <span style={{ fontSize: '12px', color: '#ff4d4f' }}>⚠️ 请先在表格中创建「附件」类型字段</span>
          )}
        </div>

        <div style={{
          marginBottom: '12px', padding: '12px',
          backgroundColor: options.theme === 'dark' ? '#3a2a4d' : '#fff',
          borderRadius: '6px', border: `1px solid ${options.theme === 'dark' ? '#553c8b' : '#d3adf7'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <label style={{ fontSize: '14px', fontWeight: '700', color: '#722ed1' }}>
              ✅ 选择工资条显示字段（已选 {selectedPayslipFields.size}/{data.headers.length}）
            </label>
            <button onClick={handleSelectAllPayslipFields} style={{
              padding: '6px 12px', backgroundColor: '#f0f0f0', border: '1px solid #ccc',
              borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#666'
            }}>
              {selectedPayslipFields.size >= data.headers.length ? '全不选' : '全选'}
            </button>
          </div>
          <div style={{
            maxHeight: '220px', overflowY: 'auto', padding: '10px',
            backgroundColor: options.theme === 'dark' ? '#2d2d2d' : '#fafafa',
            borderRadius: '4px', border: `1px solid ${options.theme === 'dark' ? '#444' : '#eee'}`
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
              {data.headers.map(header => (
                <label key={header.id} style={{
                  display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px',
                  padding: '8px 10px', borderRadius: '4px',
                  backgroundColor: selectedPayslipFields.has(header.id) ? '#e6f7ff' : 'transparent',
                  border: selectedPayslipFields.has(header.id) ? '1px solid #91d5ff' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}>
                  <input type="checkbox" checked={selectedPayslipFields.has(header.id)}
                    onChange={() => handlePayslipFieldToggle(header.id)}
                    style={{ marginRight: '8px', cursor: 'pointer', width: '16px', height: '16px' }} />
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: selectedPayslipFields.has(header.id) ? '#0050b3' : (options.theme === 'dark' ? '#fff' : '#333'),
                    fontWeight: selectedPayslipFields.has(header.id) ? '600' : '400'
                  }} title={header.name}>{header.name}</span>
                </label>
              ))}
            </div>
          </div>
          {selectedPayslipFields.size === 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#ff4d4f' }}>⚠️ 请至少勾选一个字段</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => {
            const selected = Array.from(selectedRows);
            const fields = Array.from(selectedPayslipFields);
            onGeneratePayslips(selected.length > 0 ? selected : undefined, fields.length > 0 ? fields : undefined);
          }}
            disabled={isGeneratingPayslips || selectedPayslipFields.size === 0}
            style={{
              padding: '10px 20px', backgroundColor: '#722ed1', color: 'white',
              border: 'none', borderRadius: '6px', cursor: isGeneratingPayslips || selectedPayslipFields.size === 0 ? 'not-allowed' : 'pointer',
              fontSize: '15px', fontWeight: '600', opacity: isGeneratingPayslips || selectedPayslipFields.size === 0 ? 0.6 : 1
            }}>
            {isGeneratingPayslips
              ? `生成中 ${payslipProgress?.current || 0}/${payslipProgress?.total || 0}...`
              : selectedRows.size > 0
                ? `生成选中 ${selectedRows.size} 人的工资条`
                : '生成全部工资条到附件'}
          </button>
        </div>

        {isGeneratingPayslips && payslipProgress && (
          <div style={{
            marginTop: '12px', padding: '12px',
            backgroundColor: options.theme === 'dark' ? '#2d2d2d' : '#fff',
            borderRadius: '6px', border: `1px solid ${options.theme === 'dark' ? '#555' : '#d3adf7'}`,
            fontSize: '13px', color: '#722ed1'
          }}>
            正在生成工资条：{payslipProgress.current} / {payslipProgress.total}，请稍候...
            <div style={{ marginTop: '8px', height: '8px', backgroundColor: '#e8e8e8', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${payslipProgress.total > 0 ? (payslipProgress.current / payslipProgress.total * 100) : 0}%`,
                backgroundColor: '#722ed1', borderRadius: '4px', transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
          💡 勾选左侧复选框可只生成选中人员；在上方勾选要在工资条里展示的字段。生成后自动存入该行附件字段。
        </div>
      </div>

      {/* 导出选项 */}
      <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: options.theme === 'dark' ? '#2d2d2d' : '#f5f5f5', borderRadius: '8px' }}>
        {configLoaded && (
          <div style={{
            marginBottom: '12px', padding: '8px',
            backgroundColor: options.theme === 'dark' ? '#444' : '#e6f7ff',
            borderRadius: '4px', border: `1px solid ${options.theme === 'dark' ? '#555' : '#91d5ff'}`,
            fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#1890ff', fontWeight: 'bold' }}>💡</span>
              <span>已加载历史保存配置</span>
              {lastSavedTime && (
                <span style={{ color: options.theme === 'dark' ? '#999' : '#666', fontSize: '11px' }}>
                  （最后保存：{new Date(lastSavedTime).toLocaleString()}）
                </span>
              )}
            </div>
            <button onClick={onClearConfig} style={{
              padding: '4px 8px', backgroundColor: '#ff4d4f', color: 'white',
              border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px'
            }}>清除配置</button>
          </div>
        )}

        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>导出选项</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={options.includeHeaders}
              onChange={(e) => onOptionsChange({ ...options, includeHeaders: e.target.checked })}
              style={{ marginRight: '8px' }} />
            包含表头
          </label>

          {options.includeHeaders && (
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginLeft: '24px' }}>
              <input type="checkbox" checked={options.includeFieldTypes !== false}
                onChange={(e) => onOptionsChange({ ...options, includeFieldTypes: e.target.checked })}
                style={{ marginRight: '8px' }} />
              显示字段类型
            </label>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ minWidth: '60px' }}>最大行数:</label>
            <input type="number" value={options.maxRows || ''} placeholder="全部" min="1" max="1000"
              onChange={(e) => onOptionsChange({ ...options, maxRows: e.target.value ? parseInt(e.target.value) : undefined })}
              style={{ width: '80px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ minWidth: '60px' }}>主题:</label>
            <select value={options.theme || 'light'}
              onChange={(e) => onOptionsChange({ ...options, theme: e.target.value as 'light' | 'dark' })}
              style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ minWidth: '60px' }}>字段过滤:</label>
            <button onClick={() => setShowFieldFilter(!showFieldFilter)} style={{
              padding: '4px 8px', backgroundColor: showFieldFilter ? '#1890ff' : '#f0f0f0',
              color: showFieldFilter ? 'white' : '#333', border: '1px solid #ccc',
              borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
            }}>
              {options.excludedFieldTypes && options.excludedFieldTypes.length > 0
                ? `已排除 ${options.excludedFieldTypes.length} 种类型` : '设置过滤'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ minWidth: '60px' }}>列比较:</label>
            <button onClick={() => setShowComparisonSettings(!showComparisonSettings)} style={{
              padding: '4px 8px', backgroundColor: showComparisonSettings ? '#1890ff' : '#f0f0f0',
              color: showComparisonSettings ? 'white' : '#333', border: '1px solid #ccc',
              borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
            }}>
              {comparisonRules.length > 0 ? `已设置 ${comparisonRules.length} 条规则` : '设置比较'}
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={exportSelectedOnly}
              onChange={(e) => setExportSelectedOnly(e.target.checked)}
              style={{ marginRight: '8px' }} />
            仅导出选中行
            <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>
              已选 {selectedRows.size} / {data.rows.slice(0, options.maxRows || data.rows.length).length} 条
            </span>
            {selectedRows.size > 0 && (
              <button onClick={() => setSelectedRows(new Set())} style={{
                padding: '2px 8px', backgroundColor: '#f0f0f0', border: '1px solid #ccc',
                borderRadius: '3px', cursor: 'pointer', fontSize: '11px', color: '#666', marginLeft: '8px'
              }}>清空选择</button>
            )}
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ minWidth: '60px' }}>目标表:</label>
            <select value={selectedTableId || ''} onChange={(e) => setSelectedTableId(e.target.value || undefined)}
              disabled={!tablesLoaded || tables.length === 0}
              style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', minWidth: '150px' }}>
              {!tablesLoaded ? <option value="">加载中...</option> :
                tables.length === 0 ? <option value="">无可用数据表</option> :
                tables.map(table => <option key={table.id} value={table.id}>{table.name}</option>)}
            </select>
          </div>
        </div>

        {showFieldFilter && (
          <div style={{
            marginTop: '12px', padding: '12px',
            backgroundColor: options.theme === 'dark' ? '#3a3a3a' : '#fafafa',
            borderRadius: '6px', border: `1px solid ${options.theme === 'dark' ? '#555' : '#ddd'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>选择要排除的字段类型</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={resetFieldFilter} style={{ padding: '4px 8px', backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>重置</button>
                <button onClick={applyFieldFilter} style={{ padding: '4px 8px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>应用</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
              {allFieldTypes.map(fieldType => (
                <label key={fieldType.type} style={{
                  display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px', padding: '4px', borderRadius: '3px',
                  backgroundColor: tempExcludedTypes.includes(fieldType.type) ? (options.theme === 'dark' ? '#555' : '#e6f7ff') : 'transparent'
                }}>
                  <input type="checkbox" checked={tempExcludedTypes.includes(fieldType.type)}
                    onChange={() => handleFieldFilterToggle(fieldType.type)} style={{ marginRight: '6px' }} />
                  {fieldType.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {showComparisonSettings && (
          <div style={{
            marginTop: '12px', padding: '12px',
            backgroundColor: options.theme === 'dark' ? '#3a3a3a' : '#fafafa',
            borderRadius: '6px', border: `1px solid ${options.theme === 'dark' ? '#555' : '#ddd'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>列比较设置</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleExportRules} disabled={comparisonRules.length === 0} style={{ padding: '4px 8px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>导出规则</button>
                <button onClick={handleImportRulesClick} style={{ padding: '4px 8px', backgroundColor: '#faad14', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>导入规则</button>
                <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" style={{ display: 'none' }} />
                <button onClick={addComparisonRule} style={{ padding: '4px 8px', backgroundColor: '#52c41a', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>+ 添加规则</button>
              </div>
            </div>
            <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: options.theme === 'dark' ? '#444' : '#fff7e6', borderRadius: '4px', fontSize: '11px', color: options.theme === 'dark' ? '#ccc' : '#fa8c16' }}>
              💡 提示：选择比较项列和目标列，设置比较条件，满足条件的目标列单元格将显示为浅红色背景和深红色文本
            </div>
            {comparisonRules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#666', fontSize: '12px' }}>
                暂无比较规则，点击上方"添加规则"开始设置
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {comparisonRules.map((rule, index) => (
                  <div key={rule.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
                    backgroundColor: options.theme === 'dark' ? '#444' : '#f0f0f0', borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>规则 {index + 1}:</div>
                    <span style={{ fontSize: '11px', color: '#666' }}>比较项：</span>
                    <select value={rule.compareColumn} onChange={(e) => updateComparisonRule(rule.id, { compareColumn: e.target.value })}
                      style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '12px' }}>
                      {data.headers.map(header => <option key={header.id} value={header.id}>{header.name}</option>)}
                    </select>
                    <select value={rule.operator} onChange={(e) => updateComparisonRule(rule.id, { operator: e.target.value as ComparisonOperator })}
                      style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '12px' }}>
                      {Object.entries(operatorDisplay).map(([value, display]) => <option key={value} value={value}>{display}</option>)}
                    </select>
                    <span style={{ fontSize: '11px', color: '#666' }}>目标列：</span>
                    <select value={rule.targetColumn} onChange={(e) => updateComparisonRule(rule.id, { targetColumn: e.target.value })}
                      style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '12px' }}>
                      {data.headers.map(header => <option key={header.id} value={header.id}>{header.name}</option>)}
                    </select>
                    <button onClick={() => deleteComparisonRule(rule.id)} style={{ padding: '4px 8px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>删除</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button onClick={onExport} style={{ padding: '8px 16px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>导出为PNG</button>
          <button onClick={onAddToTable} disabled={isAddingToTable} style={{ padding: '8px 16px', backgroundColor: '#52c41a', color: 'white', border: 'none', borderRadius: '4px', cursor: isAddingToTable ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: isAddingToTable ? 0.6 : 1 }}>{isAddingToTable ? '添加中...' : '添加到表格'}</button>
        </div>
      </div>

      {data.groupInfo && data.groupInfo.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: options.theme === 'dark' ? '#2d2d2d' : '#f0f7ff', borderRadius: '6px', border: `1px solid ${options.theme === 'dark' ? '#404040' : '#d1e7ff'}` }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: options.theme === 'dark' ? '#fff' : '#0050b3' }}>分组字段:</div>
          <div style={{ fontSize: '11px', color: options.theme === 'dark' ? '#ccc' : '#666' }}>
            {data.groupInfo.map((group) => (
              <span key={group.fieldId} style={{
                display: 'inline-block', margin: '2px 4px 2px 0', padding: '2px 6px',
                backgroundColor: options.theme === 'dark' ? '#404040' : '#e6f7ff',
                border: `1px solid ${options.theme === 'dark' ? '#555' : '#91d5ff'}`, borderRadius: '3px'
              }}>
                {data.headers.find(h => h.id === group.fieldId)?.name || group.fieldId}
                {group.desc && ' (降序)'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px', fontSize: '12px', color: options.theme === 'dark' ? '#ccc' : '#666' }}>
        共 {data.rows.length} 条记录，{data.headers.length} 个字段
        {options.maxRows && ` (显示前 ${Math.min(options.maxRows, data.rows.length)} 条)`}
        {selectedRows.size > 0 && `，已勾选 ${selectedRows.size} 条`}
      </div>

      <div id="table-container" style={{
        overflow: 'auto', border: `1px solid ${options.theme === 'dark' ? '#404040' : '#d9d9d9'}`,
        borderRadius: '8px', backgroundColor: options.theme === 'dark' ? '#1f1f1f' : '#ffffff'
      }}>
        <table ref={tableRef} style={{
          borderCollapse: 'separate', borderSpacing: '0', width: 'auto',
          minWidth: '800px', tableLayout: 'fixed'
        }}>
          {options.includeHeaders && (
            <thead>
              <tr>
                <th style={{
                  borderRight: `1px solid ${options.theme === 'dark' ? '#404040' : '#d9d9d9'}`,
                  borderBottom: `1px solid ${options.theme === 'dark' ? '#404040' : '#d9d9d9'}`,
                  padding: '8px 8px', backgroundColor: options.theme === 'dark' ? '#2d2d2d' : '#fafafa',
                  fontWeight: 'bold', textAlign: 'center', fontSize: '12px',
                  width: '40px', minWidth: '40px', maxWidth: '40px', verticalAlign: 'middle'
                }}>
                  <input type="checkbox"
                    checked={selectedRows.size > 0 && selectedRows.size >= data.rows.slice(0, options.maxRows || data.rows.length).length}
                    onChange={handleSelectAll} style={{ cursor: 'pointer' }} title="全选/取消全选" />
                </th>
                {data.headers.map((header, index) => (
                  <th key={header.id} style={{
                    borderRight: index === data.headers.length - 1 ? 'none' : `1px solid ${options.theme === 'dark' ? '#404040' : '#d9d9d9'}`,
                    borderBottom: `1px solid ${options.theme === 'dark' ? '#404040' : '#d9d9d9'}`,
                    padding: '8px 12px', backgroundColor: options.theme === 'dark' ? '#2d2d2d' : '#fafafa',
                    fontWeight: 'bold', textAlign: 'center', fontSize: '12px',
                    width: columnWidths[index] || (options.cellWidth || 120),
                    minWidth: columnWidths[index] || (options.cellWidth || 120),
                    maxWidth: columnWidths[index] ? `${columnWidths[index] * 1.5}px` : '240px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle'
                  }} title={`${header.name} (${getFieldTypeName(header.type)})`}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div>{header.name}</div>
                      {options.includeFieldTypes !== false && (
                        <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#999', marginTop: '2px' }}>
                          {getFieldTypeName(header.type)}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          )}

          <tbody>
            {data.rows
              .filter(row => !exportSelectedOnly || selectedRows.has(row.recordId))
              .slice(0, options.maxRows || data.rows.length)
              .map((row) => (
                <tr key={row.recordId} style={{
                  backgroundColor: selectedRows.has(row.recordId)
                    ? (options.theme === 'dark' ? '#1a3a5c' : '#e6f7ff') : 'transparent'
                }}>
                  <td style={{
                    borderRight: `1px solid ${options.theme === 'dark' ? '#404040' : '#d9d9d9'}`,
                    borderBottom: `1px solid ${options.theme === 'dark' ? '#404040' : '#d9d9d9'}`,
                    height: options.cellHeight || 32, width: '40px', minWidth: '40px', maxWidth: '40px',
                    textAlign: 'center', verticalAlign: 'middle', padding: '6px 8px',
                    backgroundColor: selectedRows.has(row.recordId)
                      ? (options.theme === 'dark' ? '#1a3a5c' : '#e6f7ff') : 'transparent'
                  }}>
                    <input type="checkbox" checked={selectedRows.has(row.recordId)}
                      onChange={() => handleRowSelect(row.recordId)} style={{ cursor: 'pointer' }} />
                  </td>
                  {row.cells.map((cell, cellIndex) => {
                    const originalRowIndex = data.rows.findIndex(r => r.recordId === row.recordId);
                    const isMatchingCell = matchingCells.has(`${originalRowIndex}-${cellIndex}`);
                    return (
                      <td key={`${row.recordId}-${cellIndex}`} style={{
                        borderRight: cellIndex === row.cells.length - 1 ? 'none' : `1px solid ${options.theme === 'dark' ? '#404040' : '#d9d9d9'}`,
                        borderBottom: `1px solid ${options.theme === 'dark' ? '#404040' : '#d9d9d9'}`,
                        height: options.cellHeight || 32,
                        width: columnWidths[cellIndex] || (options.cellWidth || 120),
                        minWidth: columnWidths[cellIndex] || (options.cellWidth || 120),
                        maxWidth: columnWidths[cellIndex] ? `${columnWidths[cellIndex] * 1.5}px` : '240px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        verticalAlign: 'middle', padding: '6px 12px',
                        backgroundColor: isMatchingCell ? '#ffebee' : getCellBackgroundColor(cell.type, cell.value),
                        color: isMatchingCell ? '#c62828' : (options.theme === 'dark' ? '#fff' : '#000'),
                        fontSize: '12px', fontWeight: isMatchingCell ? 'bold' : 'normal',
                        ...getCellAlignment()
                      }} title={cell.value}>
                        {cell.value}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function getFieldTypeName(fieldType: FieldType): string {
  const typeNames: Record<number, string> = {
    1: '多行文本', 2: '数字', 3: '单选', 4: '多选', 5: '日期', 7: '复选框',
    11: '人员', 13: '电话', 15: '超链接', 17: '附件', 18: '单向关联',
    21: '双向关联', 22: '地理位置', 99003: '货币', 99002: '进度', 99004: '评分',
    99005: '邮箱', 1005: '自动编号', 20: '公式', 1001: '创建时间', 1002: '修改时间',
    1003: '创建人', 1004: '修改人', 19: '查找引用', 99001: '二维码', 23: '群聊'
  };
  return typeNames[fieldType] || '未知类型';
}

export default TableRenderer;
