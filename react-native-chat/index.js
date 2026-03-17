// ===================================================================
// CRITICAL POLYFILLS FOR REACT-NATIVE-REANIMATED WEB SUPPORT
// This MUST execute before ANY imports
// ===================================================================

// Use globalThis for better compatibility
const g = typeof globalThis !== 'undefined' ? globalThis :
    typeof window !== 'undefined' ? window :
        typeof global !== 'undefined' ? global : {};

// Setup Reanimated logger config - must exist before reanimated loads
g.__reanimatedLoggerConfig = g.__reanimatedLoggerConfig || {
    debug: false,
    strict: false,
};

// Additional web polyfills
if (typeof window !== 'undefined') {
    // Polyfill requestAnimationFrame
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = (callback) => {
            return setTimeout(callback, 1000 / 60);
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = (id) => {
            clearTimeout(id);
        };
    }

    // Ensure performance.now exists
    if (!window.performance?.now) {
        window.performance = window.performance || {};
        window.performance.now = () => Date.now();
    }
}

// Now safe to import
import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
