import React, { useState, useEffect } from 'react';
import { bitable, IFieldMeta, IRecord } from '@lark-base-open/js-sdk';
import TableRenderer from './components/TableRenderer';
import FieldWidthManager from './components/FieldWidthManager';
import { exportToPNG, checkBrowserCompatibility } from './utils/pngExporter';
import { processTableData, getFieldFilterOptions } from './utils/dataProcessor';
import { TableData, TableRenderData, ExportOptions } from './types';
import { loadConfig, saveConfig, clearConfig, getLastSavedTime } from './utils/localStorage';
import { getTablesInfo, showMessage, subscribeToTableChanges, addTableScreenshotToTable, batchGeneratePayslipsToAttachments, getAttachmentFields } from './utils/imageToTableAttachment';
import errorCollector, { ErrorSeverity } from './utils/errorCollector';

const App: React.FC = () => {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [renderData, setRenderData] = useState<TableRenderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [options, setOptions] = useState<ExportOptions>({
    includeHeaders: true,
    maxRows: undefined,
    cellWidth: 120,
    cellHeight: 32,
    fontSize: 12,
    theme: 'light',
    comparisonRules: []
  });
  const [showFieldWidthManager, setShowFieldWidthManager] = useState(false);
  const [fieldWidths, setFieldWidths] = useState<{ [fieldId: string]: number }>({});
  
  const [configLoaded, setConfigLoaded] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  
  const [tables, setTables] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>();
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [isAddingToTable, setIsAddingToTable] = useState(false);

  const [isGeneratingPayslips, setIsGeneratingPayslips] = useState(false);
  const [payslipProgress, setPayslipProgress] = useState<{ current: number; total: number } | null>(null);
  const [attachmentFields, setAttachmentFields] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAttachmentFieldId, setSelectedAttachmentFieldId] = useState<string>('');

  const loadAttachmentFields = async () => {
    try {
      const table = await bitable.base.getActiveTable();
      const fields = await getAttachmentFields(table);
      setAttachmentFields(fields);
      if (fields.length > 0 && !selectedAttachmentFieldId) {
        setSelectedAttachmentFieldId(fields[0].id);
      }
    } catch (err) {
      console.error('加载附件字段失败', err);
    }
  };

  const handleGeneratePayslips = async (selectedRecordIds?: string[], selectedFieldIds?: string[]) => {
    if (!renderData) {
      setError('没有可生成的数据');
      return;
    }
    if (!selectedAttachmentFieldId) {
      showMessage('请先选择要存入的附件字段', 'error');
      return;
    }
    try {
      setIsGeneratingPayslips(true);
      setPayslipProgress({ current: 0, total: selectedRecordIds?.length || renderData.rows.length });
      const result = await batchGeneratePayslipsToAttachments(
        renderData,
        selectedAttachmentFieldId,
        selectedRecordIds,
        selectedFieldIds,
        {
          theme: options.theme,
          scale: 2,
          title: '工资条',
          onProgress: (current, total) => setPayslipProgress({ current, total }),
        }
      );
      if (result.failed === 0) {
        showMessage(`成功生成 ${result.success} 张工资条，已存入附件字段`, 'success');
      } else {
        showMessage(`成功 ${result.success} 张，失败 ${result.failed} 张`, 'error');
      }
    } catch (err) {
      showMessage(`生成失败: ${(err as Error).message}`, 'error');
    } finally {
      setIsGeneratingPayslips(false);
      setPayslipProgress(null);
    }
  };

  useEffect(() => {
    loadTableData();
    const unsubscribeRecords = bitable.base.onSelectionChange(() => {
      loadTableData();
    });
    return () => {
      unsubscribeRecords();
    };
  }, []);

  useEffect(() => {
    const savedConfig = loadConfig();
    const savedLastTime = getLastSavedTime();
    if (savedConfig) {
      setOptions(savedConfig.options);
      setFieldWidths(savedConfig.fieldWidths);
      setConfigLoaded(true);
    }
    if (savedLastTime) {
      setLastSavedTime(savedLastTime);
    }
  }, []);
  
  const loadTables = async () => {
    try {
      const tablesList = await getTablesInfo();
      setTables(tablesList);
      const isSelectedTableValid = selectedTableId && tablesList.some(table => table.id === selectedTableId);
      if (tablesList.length > 0 && (!selectedTableId || !isSelectedTableValid)) {
        setSelectedTableId(tablesList[0].id);
      }
      setTablesLoaded(true);
    } catch (error) {
      errorCollector.captureApiError('加载数据表列表失败', { error: error as Error, severity: ErrorSeverity.MEDIUM });
      showMessage('加载数据表列表失败: ' + (error as Error).message, 'error');
    }
  };
  
  useEffect(() => {
    loadTables();
    const unsubscribe = subscribeToTableChanges(() => { loadTables(); });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (configLoaded || lastSavedTime) {
      const success = saveConfig(options, fieldWidths);
      if (success) setLastSavedTime(new Date().toISOString());
    }
  }, [options, fieldWidths]);

  const loadTableData = async () => {
    try {
      setLoading(true);
      setError(null);
      const table = await bitable.base.getActiveTable();
      const tableName = await table.getName();
      const view = await table.getActiveView();
      const visibleFieldIds = await view.getVisibleFieldIdList();
      const allFieldMetaList = await table.getFieldMetaList();
      const visibleFields = visibleFieldIds
        .map(fieldId => allFieldMetaList.find(field => field.id === fieldId))
        .filter(field => field !== undefined) as IFieldMeta[];
      const visibleRecordIds = await view.getVisibleRecordIdList();
      const validRecordIds = visibleRecordIds.filter((id): id is string => id !== undefined);
      const recordsResponse = await table.getRecords({ pageSize: 5000 });
      const orderedRecords = validRecordIds
        .map(recordId => recordsResponse.records.find(record => record.recordId === recordId))
        .filter(record => record !== undefined) as IRecord[];
      const data: TableData = { fields: visibleFields, records: orderedRecords, tableName };
      setTableData(data);
      
      const viewColumnWidths: { [fieldId: string]: number } = {};
      let groupInfo: any[] = [];
      try {
        for (const field of visibleFields) {
          try {
            const width = await (view as any).getFieldWidth(field.id);
            if (width && width > 0) viewColumnWidths[field.id] = width;
          } catch (fieldErr) {
            console.warn(`无法获取字段 ${field.id} 的宽度:`, fieldErr);
          }
        }
        try { groupInfo = await (view as any).getGroupInfo(); }
        catch (groupErr) { console.warn('无法获取分组信息:', groupErr); }
      } catch (err) {
        console.warn('无法获取视图列宽配置:', err);
      }
      setFieldWidths(viewColumnWidths);
      const processed = processTableData(visibleFields, orderedRecords, options.excludedFieldTypes || [], viewColumnWidths, groupInfo);
      setRenderData(processed);
      loadAttachmentFields();
      setTimeout(() => {
        const autoFitWidths = handleAutoFitWidths(visibleFields, processed);
        setFieldWidths(autoFitWidths);
      }, 100);
    } catch (err) {
      errorCollector.captureApiError('加载表格数据失败', { error: err as Error, severity: ErrorSeverity.HIGH });
      setError(`加载失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!renderData) { setError('没有可导出的数据'); return; }
    const compatibility = checkBrowserCompatibility();
    if (!compatibility.compatible) { setError(compatibility.message || '浏览器不兼容'); return; }
    try {
      await exportToPNG('table-container', options);
    } catch (err) {
      errorCollector.captureExportError('导出失败', { error: err as Error, details: { stack: (err as Error).stack } });
      setError(`导出失败: ${(err as Error).message}`);
    }
  };
  
  const handleAddToTable = async () => {
    if (!renderData) { setError('没有可添加的数据'); return; }
    try {
      setIsAddingToTable(true);
      const result = await addTableScreenshotToTable('table-container', selectedTableId, { theme: options.theme, scale: 2 });
      if (result.success) showMessage(result.message, 'success');
      else showMessage(result.message, 'error');
    } catch (err) {
      errorCollector.captureApiError('添加到表格失败', { error: err as Error, severity: ErrorSeverity.MEDIUM });
      showMessage(`添加失败: ${(err as Error).message}`, 'error');
    } finally {
      setIsAddingToTable(false);
    }
  };

  const handleOptionsChange = (newOptions: ExportOptions) => {
    setOptions(newOptions);
    if ((newOptions.excludedFieldTypes !== options.excludedFieldTypes || newOptions.comparisonRules !== options.comparisonRules) && tableData) {
      const processed = processTableData(tableData.fields, tableData.records, newOptions.excludedFieldTypes || [], fieldWidths, renderData?.groupInfo || []);
      setRenderData(processed);
    }
  };

  const handleReload = () => { loadTableData(); };
  const handleFieldWidthChange = (fieldId: string, width: number) => {
    setFieldWidths(prev => ({ ...prev, [fieldId]: width }));
  };
  const handleApplyAllWidths = (widths: { [fieldId: string]: number }) => { setFieldWidths(widths); };

  const handleClearConfig = () => {
    const success = clearConfig();
    if (success) {
      setOptions({ includeHeaders: true, maxRows: undefined, cellWidth: 120, cellHeight: 32, fontSize: 12, theme: 'light' });
      setFieldWidths({});
      setConfigLoaded(false);
      setLastSavedTime(null);
    }
  };

  const handleAutoFitWidths = (fields: IFieldMeta[], tableData: TableRenderData): { [fieldId: string]: number } => {
    const autoFitWidths: { [fieldId: string]: number } = {};
    fields.forEach(field => {
      let maxContentLength = field.name.length;
      if (tableData?.rows) {
        const fieldIndex = tableData.headers.findIndex(h => h.id === field.id);
        if (fieldIndex !== -1) {
          tableData.rows.forEach(row => {
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
        case 1: minWidth = 50; break;
        case 15: minWidth = 60; break;
        case 2: case 99003: minWidth = 40; break;
        case 99002: case 99004: minWidth = 40; break;
        case 5: case 1001: case 1002: minWidth = 60; break;
        case 7: minWidth = 30; break;
        case 11: case 1003: case 1004: case 23: minWidth = 50; break;
        case 13: minWidth = 50; break;
        case 99005: minWidth = 60; break;
        case 3: case 4: minWidth = 40; break;
        case 17: minWidth = 40; break;
        case 18: case 21: case 19: minWidth = 60; break;
        case 22: minWidth = 60; break;
        case 20: minWidth = 50; break;
        default: minWidth = 40;
      }
      const calculatedWidth = Math.min(maxContentLength * 6, 500);
      autoFitWidths[field.id] = Math.max(calculatedWidth, minWidth);
    });
    return autoFitWidths;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>正在加载数据...</div>
          <div style={{ fontSize: '12px', color: '#666' }}>请稍候</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '20px', border: '1px solid #ff4d4f', borderRadius: '8px', backgroundColor: '#fff2f0', maxWidth: '400px' }}>
          <div style={{ fontSize: '16px', marginBottom: '12px', color: '#ff4d4f' }}>加载失败</div>
          <div style={{ fontSize: '14px', marginBottom: '16px', color: '#666' }}>{error}</div>
          <button onClick={handleReload} style={{ padding: '8px 16px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>重新加载</button>
        </div>
      </div>
    );
  }

  if (!renderData || renderData.rows.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>{tableData?.tableName || '当前表格'} 暂无数据</div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>请先在表格中添加一些记录</div>
          <button onClick={handleReload} style={{ padding: '8px 16px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>刷新数据</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ padding: '12px 16px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #d9d9d9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#262626' }}>{tableData?.tableName || '表格数据导出'}</h1>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>将表格数据导出为PNG图片</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowFieldWidthManager(!showFieldWidthManager)} style={{ padding: '6px 12px', backgroundColor: showFieldWidthManager ? '#1890ff' : '#f0f0f0', color: showFieldWidthManager ? 'white' : '#333', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            {showFieldWidthManager ? '隐藏宽度管理' : '字段宽度'}
          </button>
          <button onClick={handleReload} style={{ padding: '6px 12px', backgroundColor: '#f0f0f0', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>刷新数据</button>
        </div>
      </div>
      <div style={{ height: 'calc(100vh - 60px)', overflow: 'auto' }}>
        {showFieldWidthManager && tableData && (
          <div style={{ marginBottom: '16px' }}>
            <FieldWidthManager fields={tableData.fields} currentWidths={fieldWidths} onWidthChange={handleFieldWidthChange} onApplyAll={handleApplyAllWidths} tableData={renderData} />
          </div>
        )}
        <TableRenderer
          data={renderData}
          options={options}
          onExport={handleExport}
          onAddToTable={handleAddToTable}
          onOptionsChange={handleOptionsChange}
          allFieldTypes={getFieldFilterOptions()}
          customColumnWidths={fieldWidths}
          onColumnWidthChange={handleFieldWidthChange}
          configLoaded={configLoaded}
          lastSavedTime={lastSavedTime}
          onClearConfig={handleClearConfig}
          tables={tables}
          selectedTableId={selectedTableId}
          setSelectedTableId={setSelectedTableId}
          tablesLoaded={tablesLoaded}
          isAddingToTable={isAddingToTable}
          onGeneratePayslips={handleGeneratePayslips}
          isGeneratingPayslips={isGeneratingPayslips}
          payslipProgress={payslipProgress}
          attachmentFields={attachmentFields}
          selectedAttachmentFieldId={selectedAttachmentFieldId}
          onAttachmentFieldChange={setSelectedAttachmentFieldId}
        />
      </div>
    </div>
  );
};

export default App;
