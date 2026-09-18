import { createRoot } from 'react-dom/client';
import App from './App';

// 确保DOM已加载
const initApp = () => {
  const container = document.getElementById('root');
  if (!container) {
    console.error('找不到root元素');
    return;
  }

  const root = createRoot(container);
  root.render(<App />);
};

// 如果DOM已经加载完成，直接初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// 错误处理
window.addEventListener('error', (event) => {
  console.error('应用错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
});
