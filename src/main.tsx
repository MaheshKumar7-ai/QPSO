import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safeguard window.performance.measure and mark against DataCloneError and buffer limits
if (typeof window !== 'undefined' && window.performance) {
  if (typeof window.performance.measure === 'function') {
    const originalMeasure = window.performance.measure.bind(window.performance);
    window.performance.measure = function (name: string, startOrOptions?: any, endMark?: any) {
      try {
        return originalMeasure(name, startOrOptions, endMark);
      } catch (err: any) {
        // If the options/detail object contains non-clonable data (React fibers, circular references, large objects)
        if (err && (err.name === 'DataCloneError' || err.message?.includes('cannot be cloned'))) {
          try {
            if (startOrOptions && typeof startOrOptions === 'object') {
              const { detail: _unused, ...safeOptions } = startOrOptions;
              return originalMeasure(name, safeOptions, endMark);
            }
            return originalMeasure(name);
          } catch {
            return undefined as any;
          }
        }
        return undefined as any;
      }
    };
  }

  if (typeof window.performance.mark === 'function') {
    const originalMark = window.performance.mark.bind(window.performance);
    window.performance.mark = function (name: string, markOptions?: any) {
      try {
        return originalMark(name, markOptions);
      } catch {
        return undefined as any;
      }
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

