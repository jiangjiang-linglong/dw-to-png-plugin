import html2canvas from 'html2canvas';
import { ExportOptions } from '../types';
import errorCollector from './errorCollector';

function showMessage(message: string, type: 'success' | 'error'): void {
  const messageEl = document.createElement('div');
  const bgColor = type === 'success' ? '#52c41a' : '#ff4d4f';
  messageEl.style.cssText = `position:fixed;top:20px;right:20px;background:${bgColor};color:white;padding:12px 20px;border-radius:6px;z-index:10000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:300px;`;
  messageEl.textContent = message;
  document.body.appendChild(messageEl);
  setTimeout(() => { if (messageEl.parentNode) messageEl.parentNode.removeChild(messageEl); }, 3000);
}

export async function exportToPNG(
  elementId: string,
  options: ExportOptions
): Promise<{ success: boolean; imageUrl?: string; message?: string }> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`找不到元素: ${elementId}`);

  try {
    showLoading('正在生成图片...');

    const canvasOptions = {
      backgroundColor: options.theme === 'dark' ? '#1f1f1f' : '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc: Document) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.overflow = 'visible';
          clonedElement.style.border = 'none';
          const clonedTable = clonedElement.querySelector('table');
          if (clonedTable) {
            clonedTable.style.width = 'auto';
            clonedTable.style.tableLayout = 'fixed';
            const headers = clonedTable.querySelectorAll('th');
            headers.forEach((header, index) => {
              (header as HTMLElement).style.textAlign = 'center';
              (header as HTMLElement).style.verticalAlign = 'middle';
              if (index === headers.length - 1) (header as HTMLElement).style.borderRight = 'none';
            });
            const rows = clonedTable.querySelectorAll('tbody tr');
            rows.forEach((row) => {
              const cells = row.querySelectorAll('td');
              cells.forEach((cell, cellIndex) => {
                (cell as HTMLElement).style.verticalAlign = 'middle';
                (cell as HTMLElement).style.textAlign = 'center';
                if (cellIndex === cells.length - 1) (cell as HTMLElement).style.borderRight = 'none';
              });
            });
          }
        }
      }
    };

    const canvas = await html2canvas(element, canvasOptions);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = generateFileName();
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          hideLoading();
          showSuccess('图片导出成功！');
          URL.revokeObjectURL(url);
          resolve({ success: true, imageUrl: url, message: '图片导出成功' });
        } else {
          hideLoading();
          showError('图片生成失败，请重试');
          resolve({ success: false, message: '图片生成失败' });
        }
      }, 'image/png', 0.95);
    });
  } catch (error) {
    hideLoading();
    errorCollector.captureExportError('导出PNG失败', { error: error as Error, details: { stack: (error as Error).stack } });
    showError('导出失败：' + (error as Error).message);
    return { success: false, message: '导出失败：' + (error as Error).message };
  }
}

function generateFileName(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `table-export-${timestamp}.png`;
}

function showLoading(message: string): void {
  hideLoading();
  const loadingEl = document.createElement('div');
  loadingEl.id = 'export-loading';
  loadingEl.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px 30px;border-radius:8px;z-index:10000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;`;
  loadingEl.textContent = message;
  document.body.appendChild(loadingEl);
}

function hideLoading(): void {
  const loadingEl = document.getElementById('export-loading');
  if (loadingEl) loadingEl.remove();
}

function showSuccess(message: string): void { showMessage(message, 'success'); }
function showError(message: string): void { showMessage(message, 'error'); }

export function checkBrowserCompatibility(): { compatible: boolean; message?: string } {
  if (!document.getElementById) return { compatible: false, message: '浏览器不支持DOM操作' };
  if (!window.URL || !window.URL.createObjectURL) return { compatible: false, message: '浏览器不支持文件下载功能' };
  if (!window.HTMLCanvasElement) return { compatible: false, message: '浏览器不支持Canvas功能' };
  const canvas = document.createElement('canvas');
  try {
    canvas.width = 10000;
    canvas.height = 10000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { compatible: false, message: '浏览器不支持Canvas 2D渲染' };
  } catch (error) {
    return { compatible: false, message: '浏览器Canvas功能受限' };
  }
  return { compatible: true };
}
