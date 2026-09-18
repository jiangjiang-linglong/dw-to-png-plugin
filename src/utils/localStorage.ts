import { ExportOptions } from '../types';

const STORAGE_KEYS = {
  CONFIG: 'dwtpng_config',
  FIELD_WIDTHS: 'dwtpng_field_widths',
  LAST_SAVED_TIME: 'dwtpng_last_saved_time'
};

interface AppConfig {
  options: ExportOptions;
  fieldWidths: { [fieldId: string]: number };
}

export const saveConfig = (options: ExportOptions, fieldWidths: { [fieldId: string]: number }) => {
  try {
    const config: AppConfig = { options, fieldWidths };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    localStorage.setItem(STORAGE_KEYS.LAST_SAVED_TIME, new Date().toISOString());
    return true;
  } catch (error) {
    console.error('保存配置失败:', error);
    return false;
  }
};

export const loadConfig = (): AppConfig | null => {
  try {
    const configStr = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (configStr) return JSON.parse(configStr) as AppConfig;
    return null;
  } catch (error) {
    console.error('加载配置失败:', error);
    return null;
  }
};

export const clearConfig = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    localStorage.removeItem(STORAGE_KEYS.LAST_SAVED_TIME);
    return true;
  } catch (error) {
    console.error('清除配置失败:', error);
    return false;
  }
};

export const getLastSavedTime = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_SAVED_TIME);
  } catch (error) {
    console.error('获取最后保存时间失败:', error);
    return null;
  }
};
