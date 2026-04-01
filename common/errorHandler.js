// common/errorHandler.js
// Simple user‑friendly error display + global error catching

export function showError(container, message, showRetry = true) {
    if (!container) return;
    container.innerHTML = `
    <div style="text-align:center; padding:40px; color:var(--danger, #ef4444);">
      <h3>⚠️ Something went wrong</h3>
      <p>${message}</p>
      ${showRetry
            ? '<button onclick="location.reload()" style="margin-top:15px; padding:10px 20px; background:var(--primary); color:white; border:none; border-radius:6px; cursor:pointer;">Retry</button>'
            : ''
        }
    </div>
  `;
}

/**
 * Initialize global error handlers for uncaught errors and unhandled promise rejections.
 * @param {HTMLElement} container - The main content container where errors should be displayed.
 */
export function initGlobalErrorHandlers(container) {
    if (!container) return;

    window.addEventListener('error', (event) => {
        console.error('Global error caught:', event.error);
        // Prevent the default browser error display
        event.preventDefault();
        showError(container, 'An unexpected error occurred. Please refresh the page.', true);
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        event.preventDefault();
        showError(container, 'An unexpected error occurred. Please refresh the page.', true);
    });
}