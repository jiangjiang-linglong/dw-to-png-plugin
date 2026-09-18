# 飞书多维表格 · 表格转 PNG / 工资条生成插件

飞书多维表格边栏插件，基于 **React + TypeScript + Vite + html2canvas**，将多维表格中的数据渲染为 PNG 图片，支持批量生成工资条并回写到附件字段。

## ✨ 功能特性

- **表格截图导出**：将当前表格视图渲染为高清 PNG（2x scale），可直接下载
- **批量工资条生成**：为每条记录渲染独立的工资条卡片（标题 / 明细表格 / 高亮汇总行 / 底部说明），自动上传并写入对应记录的附件字段
- **字段选择**：可勾选工资条中需要展示的字段，支持按行批量或单人生成
- **字段格式管理**：按字段类型设置字体大小、颜色、对齐、数字格式、日期格式
- **列宽管理**：自动根据内容长度调整列宽，也可手动拖拽 / 输入数值
- **列比较规则**：设置两列之间的比较条件（大于 / 小于 / 等于等），满足条件的单元格高亮显示
- **字段类型过滤**：按需排除不需要的字段类型（附件、人员、群聊等）
- **配置持久化**：所有导出选项和列宽自动保存到浏览器 localStorage
- **深浅主题**：支持浅色 / 深色两种主题

## 📦 技术栈

- React 18 + TypeScript
- Vite 4
- @lark-base-open/js-sdk（飞书多维表格 SDK）
- html2canvas（DOM 转 Canvas）
- Lodash

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📁 目录结构

```
src/
├── App.tsx                  # 主应用组件
├── index.tsx                # 入口
├── types.ts                 # 类型定义
├── components/
│   ├── TableRenderer.tsx    # 表格渲染 + 导出 + 工资条生成 UI
│   ├── FieldFormatManager.tsx  # 字段格式管理
│   └── FieldWidthManager.tsx   # 列宽管理
└── utils/
    ├── dataProcessor.ts     # 表格数据处理
    ├── fieldFormatter.ts    # 字段值格式化
    ├── pngExporter.ts       # 表格截图导出 PNG
    ├── imageToTableAttachment.ts  # 截图回写附件字段 + 工资条批量生成
    ├── ruleExporter.ts      # 列比较规则导入导出
    ├── localStorage.ts      # 配置持久化
    └── errorCollector.ts    # 错误收集器
```

## 🔧 部署为飞书多维表格插件

1. 在 [飞书开放平台](https://open.feishu.cn/) 创建多维表格插件应用
2. 将 `npm run build` 产物（`dist/` 目录）上传到插件应用的「版本管理」
3. 在多维表格中添加该插件即可使用

## 📄 License

MIT
