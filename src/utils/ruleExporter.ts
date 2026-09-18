import { ColumnComparisonRule } from '../types';

export interface ComparisonRuleFile {
  version: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  rules: ColumnComparisonRule[];
  metadata?: { [key: string]: any };
}

export const exportRulesToFile = (
  rules: ColumnComparisonRule[],
  name: string = 'comparison-rules',
  description?: string
) => {
  try {
    const ruleFile: ComparisonRuleFile = {
      version: '1.0.0', name, description,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      rules, metadata: { ruleCount: rules.length }
    };
    const blob = new Blob([JSON.stringify(ruleFile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('导出规则失败:', error);
    return false;
  }
};

export const importRulesFromFileContent = (fileContent: string): ColumnComparisonRule[] | null => {
  try {
    const ruleFile = JSON.parse(fileContent) as ComparisonRuleFile;
    if (!ruleFile.rules || !Array.isArray(ruleFile.rules)) throw new Error('无效的规则文件格式');
    const validRules = ruleFile.rules.filter(rule =>
      rule.id && rule.compareColumn && rule.targetColumn && ['eq', 'gt', 'gte', 'lt', 'lte'].includes(rule.operator)
    );
    return validRules;
  } catch (error) {
    console.error('导入规则失败:', error);
    return null;
  }
};

export const importRulesFromFile = (file: File, callback: (rules: ColumnComparisonRule[] | null) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    if (e.target && e.target.result) {
      const fileContent = e.target.result as string;
      const rules = importRulesFromFileContent(fileContent);
      callback(rules);
    } else {
      callback(null);
    }
  };
  reader.onerror = () => callback(null);
  reader.readAsText(file);
};

export const validateRuleFile = (fileContent: string): boolean => {
  try {
    const ruleFile = JSON.parse(fileContent) as ComparisonRuleFile;
    return typeof ruleFile === 'object' && ruleFile !== null && !!ruleFile.version && !!ruleFile.rules && Array.isArray(ruleFile.rules);
  } catch (error) {
    return false;
  }
};
