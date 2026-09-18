import { bitable, FieldType, ITable, IOpenAttachment } from '@lark-base-open/js-sdk';
import errorCollector, { ErrorSeverity } from './errorCollector';
import { TableRenderData } from '../types';

type OperationError = { success: false; message: string };
type OperationSuccess<T = void> = { success: true; message: string } & T;
type OperationResult<T = void> = OperationSuccess<T> | OperationError;

type TableInfo = { id: string; name: string };

async function downloadImageAsBlob(url: string): Promise<Blob> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return await response.blob();
  } catch (error) {
    errorCollector.captureApiError('下载图片失败', { error: error as Error, severity: ErrorSeverity.MEDIUM });
    throw new Error(`下载图片失败: ${(error as Error).message}`);
  }
}

async function getTargetTable(tableId?: string): Promise<ITable> {
  try {
    const base = bitable.base;
    const table = tableId ? await base.getTable(tableId) : await base.getActiveTable();
    if (!table) throw new Error(tableId ? `未找到ID为${tableId}的数据表` : '未找到活跃数据表');
    return table;
  } catch (error) {
    errorCollector.captureApiError('获取数据表失败', { error: error as Error, severity: ErrorSeverity.HIGH });
    throw new Error(`获取数据表失败: ${(error as Error).message}`);
  }
}

async function ensureAttachmentFieldExists(table: ITable): Promise<string> {
  try {
    const fieldMetaList = await table.getFieldMetaList();
    const existingField = fieldMetaList.find(meta => meta.type === FieldType.Attachment);
    if (existingField) return existingField.id;
    const newField = await table.addField({ name: '图片附件', type: FieldType.Attachment });
    return newField as string;
  } catch (error) {
    errorCollector.captureApiError('处理附件字段失败', { error: error as Error, severity: ErrorSeverity.MEDIUM });
    throw new Error(`处理附件字段失败: ${(error as Error).message}`);
  }
}

async function addFileToTable(table: ITable, file: File, attachmentFieldId: string): Promise<string> {
  try {
    const attachmentField = await table.getField(attachmentFieldId);
    const attachmentCell = await attachmentField.createCell(file);
    const recordId = await table.addRecord(attachmentCell);
    return recordId;
  } catch (error) {
    errorCollector.captureApiError('添加文件到数据表失败', { error: error as Error, severity: ErrorSeverity.MEDIUM });
    throw new Error(`添加文件到数据表失败: ${(error as Error).message}`);
  }
}

async function generateElementScreenshot(
  elementId: string,
  options?: { theme?: 'light' | 'dark'; scale?: number }
): Promise<{ blob: Blob; url: string }> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const element = document.getElementById(elementId);
    if (!element) throw new Error(`找不到ID为${elementId}的元素`);

    const canvasOptions = {
      backgroundColor: options?.theme === 'dark' ? '#1f1f1f' : '#ffffff',
      scale: options?.scale || 2,
      useCORS: true,
      allowTaint: true,
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc: Document) => { optimizeClonedDocument(clonedDoc, elementId); }
    };

    const canvas = await html2canvas(element, canvasOptions);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('生成Blob失败')); }, 'image/png', 0.95);
    });
    const url = URL.createObjectURL(blob);
    return { blob, url };
  } catch (error) {
    errorCollector.captureExportError('生成截图失败', { error: error as Error, details: { stack: (error as Error).stack } });
    throw new Error(`生成截图失败: ${(error as Error).message}`);
  }
}

function optimizeClonedDocument(clonedDoc: Document, elementId: string): void {
  const clonedElement = clonedDoc.getElementById(elementId);
  if (!clonedElement) return;
  clonedElement.style.overflow = 'visible';
  clonedElement.style.border = 'none';
  const clonedTable = clonedElement.querySelector('table');
  if (!clonedTable) return;
  clonedTable.style.width = 'auto';
  clonedTable.style.tableLayout = 'fixed';
  const headers = clonedTable.querySelectorAll('th');
  headers.forEach((header, index) => {
    const th = header as HTMLElement;
    th.style.textAlign = 'center';
    th.style.verticalAlign = 'middle';
    if (index === headers.length - 1) th.style.borderRight = 'none';
  });
  const rows = clonedTable.querySelectorAll('tbody tr');
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    cells.forEach((cell, cellIndex) => {
      const td = cell as HTMLElement;
      td.style.verticalAlign = 'middle';
      td.style.textAlign = 'center';
      if (cellIndex === cells.length - 1) td.style.borderRight = 'none';
    });
  });
}

export async function getAllTables(): Promise<ITable[]> {
  try {
    const base = bitable.base;
    const tables = await base.getTableList();
    return Array.isArray(tables) ? tables : [];
  } catch (error) {
    errorCollector.captureApiError('获取所有数据表失败', { error: error as Error, severity: ErrorSeverity.MEDIUM });
    return [];
  }
}

export async function getTablesInfo(): Promise<TableInfo[]> {
  try {
    const tables = await getAllTables();
    const tableInfos: TableInfo[] = [];
    for (const table of tables) {
      try {
        const tableName = await table.getName();
        tableInfos.push({ id: table.id, name: tableName || `数据表 ${table.id}` });
      } catch (error) {
        errorCollector.captureApiError(`获取数据表 ${table.id} 名称失败`, { error: error as Error, context: { tableId: table.id }, severity: ErrorSeverity.LOW });
        tableInfos.push({ id: table.id, name: `数据表 ${table.id}` });
      }
    }
    return tableInfos;
  } catch (error) {
    errorCollector.captureApiError('获取数据表信息失败', { error: error as Error, severity: ErrorSeverity.MEDIUM });
    return [];
  }
}

export async function addTableScreenshotToTable(
  elementId: string,
  tableId?: string,
  options?: { theme?: 'light' | 'dark'; scale?: number }
): Promise<OperationResult<{ recordId: string; imageUrl: string }>> {
  try {
    const { blob, url: imageUrl } = await generateElementScreenshot(elementId, options);
    const fileName = `table-export-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    const table = await getTargetTable(tableId);
    const attachmentFieldId = await ensureAttachmentFieldExists(table);
    const recordId = await addFileToTable(table, file, attachmentFieldId);
    return { success: true, message: '表格截图已成功添加到数据表', recordId, imageUrl };
  } catch (error) {
    const errorObj = error as Error;
    errorCollector.captureApiError('添加表格截图失败', { error: errorObj, severity: ErrorSeverity.HIGH });
    return { success: false, message: errorObj.message };
  }
}

export async function addImageToTableAttachment(
  imageUrl: string,
  tableId?: string
): Promise<OperationResult<{ recordId: string }>> {
  try {
    const blob = await downloadImageAsBlob(imageUrl);
    const fileName = `table-export-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    const table = await getTargetTable(tableId);
    const attachmentFieldId = await ensureAttachmentFieldExists(table);
    const recordId = await addFileToTable(table, file, attachmentFieldId);
    return { success: true, message: '图片已成功添加到数据表', recordId };
  } catch (error) {
    const errorObj = error as Error;
    errorCollector.captureApiError('添加图片到数据表失败', { error: errorObj, severity: ErrorSeverity.MEDIUM });
    return { success: false, message: errorObj.message };
  }
}

export function subscribeToTableChanges(callback: () => void): () => void {
  try {
    const base = bitable.base;
    const unsubscribe = base.onSelectionChange(() => { callback(); });
    return unsubscribe;
  } catch (error) {
    errorCollector.captureApiError('设置数据表监听失败', { error: error as Error, severity: ErrorSeverity.LOW });
    return () => {};
  }
}

export function showMessage(message: string, type: 'success' | 'error' | 'info'): void {
  const messageEl = document.createElement('div');
  const bgColor = { success: '#52c41a', error: '#ff4d4f', info: '#1890ff' }[type];
  messageEl.style.cssText = `position:fixed;top:20px;right:20px;background:${bgColor};color:white;padding:12px 20px;border-radius:6px;z-index:10000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:300px;`;
  messageEl.textContent = message;
  document.body.appendChild(messageEl);
  setTimeout(() => { messageEl.remove(); }, 3000);
}

export function showLoading(message: string = '加载中...'): () => void {
  const loadingEl = document.createElement('div');
  loadingEl.id = 'table-attachment-loading';
  loadingEl.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(255,255,255,0.95);color:#333;padding:16px 24px;border-radius:8px;z-index:10001;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;`;
  const spinner = document.createElement('div');
  spinner.style.cssText = `width:16px;height:16px;border:2px solid #f3f3f3;border-top:2px solid #1890ff;border-radius:50%;animation:spin 1s linear infinite;`;
  const style = document.createElement('style');
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
  loadingEl.appendChild(spinner);
  loadingEl.appendChild(document.createTextNode(message));
  document.body.appendChild(loadingEl);
  return () => { loadingEl.remove(); style.remove(); };
}

export async function getAttachmentFields(table: ITable): Promise<Array<{ id: string; name: string }>> {
  try {
    const fieldMetaList = await table.getFieldMetaList();
    return fieldMetaList
      .filter(meta => meta.type === FieldType.Attachment)
      .map(meta => ({ id: meta.id, name: meta.name }));
  } catch (error) {
    errorCollector.captureApiError('获取附件字段列表失败', { error: error as Error, severity: ErrorSeverity.MEDIUM });
    return [];
  }
}

async function uploadFileAndCreateAttachment(file: File): Promise<IOpenAttachment> {
  const tokens = await bitable.base.batchUploadFile([file]);
  const token = tokens[0];
  if (!token) throw new Error('文件上传失败，未获取到 fileToken');
  return { name: file.name, size: file.size, type: file.type || 'image/png', token, timeStamp: Date.now() };
}

async function updateRecordWithAttachment(
  table: ITable,
  recordId: string,
  attachmentFieldId: string,
  file: File
): Promise<void> {
  const field = await table.getField(attachmentFieldId);
  const newAttachment = await uploadFileAndCreateAttachment(file);
  let existingAttachments: IOpenAttachment[] = [];
  try {
    const existingValue = await field.getValue(recordId);
    if (Array.isArray(existingValue)) existingAttachments = existingValue as IOpenAttachment[];
  } catch { /* ignore */ }
  const allAttachments = [newAttachment, ...existingAttachments];
  await field.setValue(recordId, allAttachments as any);
}

function isHighlightField(fieldName: string): boolean {
  const keywords = ['实发', '合计', '总计', '应发', '到手', 'net', 'total'];
  return keywords.some(kw => fieldName.toLowerCase().includes(kw.toLowerCase()));
}

async function generatePayslipImageForRow(
  row: TableRenderData['rows'][0],
  headers: TableRenderData['headers'],
  selectedFieldIds?: string[],
  options?: { theme?: 'light' | 'dark'; scale?: number; title?: string }
): Promise<Blob> {
  const isDark = options?.theme === 'dark';
  const bgColor = isDark ? '#1f1f1f' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1f2329';
  const subTextColor = isDark ? '#aaaaaa' : '#8f959e';
  const borderColor = isDark ? '#404040' : '#e5e6eb';
  const headerBg = isDark ? '#2d2d2d' : '#f7f8fa';
  const highlightBg = isDark ? '#3a2a1a' : '#fff7e6';
  const highlightText = isDark ? '#ffd666' : '#d46b08';

  const visibleHeaders = selectedFieldIds && selectedFieldIds.length > 0
    ? headers.filter(h => selectedFieldIds.includes(h.id))
    : headers;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-99999px;top:0;z-index:-1;opacity:0;';

  const payslip = document.createElement('div');
  payslip.style.cssText = `width:480px;background:${bgColor};border:1px solid ${borderColor};border-radius:12px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:${textColor};box-sizing:border-box;`;

  const title = document.createElement('div');
  title.style.cssText = `font-size:20px;font-weight:700;text-align:center;margin-bottom:4px;color:${textColor};`;
  title.textContent = options?.title || '工资条';
  payslip.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.style.cssText = `font-size:12px;text-align:center;color:${subTextColor};margin-bottom:20px;`;
  subtitle.textContent = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  payslip.appendChild(subtitle);

  const divider = document.createElement('div');
  divider.style.cssText = `height:1px;background:${borderColor};margin-bottom:16px;`;
  payslip.appendChild(divider);

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const th1 = document.createElement('th');
  th1.style.cssText = `text-align:left;padding:10px 12px;background:${headerBg};border:1px solid ${borderColor};font-weight:600;width:50%;`;
  th1.textContent = '项目';
  const th2 = document.createElement('th');
  th2.style.cssText = `text-align:right;padding:10px 12px;background:${headerBg};border:1px solid ${borderColor};font-weight:600;`;
  th2.textContent = '金额 / 内容';
  headerRow.appendChild(th1);
  headerRow.appendChild(th2);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  visibleHeaders.forEach((header) => {
    const cellIndex = headers.findIndex(h => h.id === header.id);
    const cell = row.cells[cellIndex];
    if (!cell) return;
    const isHighlight = isHighlightField(header.name);
    const tr = document.createElement('tr');
    if (isHighlight) tr.style.cssText = `background:${highlightBg};`;

    const tdName = document.createElement('td');
    tdName.style.cssText = `padding:9px 12px;border:1px solid ${borderColor};text-align:left;font-weight:${isHighlight ? '700' : '400'};color:${isHighlight ? highlightText : textColor};`;
    tdName.textContent = header.name;

    const tdValue = document.createElement('td');
    tdValue.style.cssText = `padding:9px 12px;border:1px solid ${borderColor};text-align:right;font-weight:${isHighlight ? '700' : '400'};color:${isHighlight ? highlightText : textColor};font-variant-numeric:tabular-nums;`;
    tdValue.textContent = cell.value || '-';

    tr.appendChild(tdName);
    tr.appendChild(tdValue);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  payslip.appendChild(table);

  const footer = document.createElement('div');
  footer.style.cssText = `margin-top:16px;font-size:11px;color:${subTextColor};text-align:center;`;
  footer.textContent = '本工资条由系统自动生成，如有疑问请联系人事部';
  payslip.appendChild(footer);

  container.appendChild(payslip);
  document.body.appendChild(container);

  try {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(payslip, {
      backgroundColor: bgColor,
      scale: options?.scale || 2,
      useCORS: true,
      allowTaint: true,
      width: payslip.scrollWidth,
      height: payslip.scrollHeight,
      windowWidth: payslip.scrollWidth,
      windowHeight: payslip.scrollHeight,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('生成图片Blob失败')); }, 'image/png', 0.95);
    });
    return blob;
  } finally {
    document.body.removeChild(container);
  }
}

export async function batchGeneratePayslipsToAttachments(
  data: TableRenderData,
  targetAttachmentFieldId: string,
  selectedRecordIds?: string[],
  selectedFieldIds?: string[],
  options?: {
    theme?: 'light' | 'dark';
    scale?: number;
    title?: string;
    onProgress?: (current: number, total: number, recordId: string) => void;
  }
): Promise<{ success: number; failed: number; errors: Array<{ recordId: string; message: string }> }> {
  if (!targetAttachmentFieldId) throw new Error('请先选择要存入的附件字段');

  const table = await bitable.base.getActiveTable();
  const rowsToProcess = selectedRecordIds && selectedRecordIds.length > 0
    ? data.rows.filter(r => selectedRecordIds.includes(r.recordId))
    : data.rows;

  const result = { success: 0, failed: 0, errors: [] as Array<{ recordId: string; message: string }> };

  for (let i = 0; i < rowsToProcess.length; i++) {
    const row = rowsToProcess[i];
    try {
      options?.onProgress?.(i + 1, rowsToProcess.length, row.recordId);
      const blob = await generatePayslipImageForRow(row, data.headers, selectedFieldIds, {
        theme: options?.theme,
        scale: options?.scale,
        title: options?.title,
      });
      const nameValue = row.cells[0]?.value || row.recordId.slice(-6);
      const safeName = String(nameValue).replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `工资条_${safeName}_${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      await updateRecordWithAttachment(table, row.recordId, targetAttachmentFieldId, file);
      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push({ recordId: row.recordId, message: (err as Error).message });
      errorCollector.captureApiError('生成工资条失败', { error: err as Error, context: { recordId: row.recordId }, severity: ErrorSeverity.MEDIUM });
    }
  }
  return result;
}
