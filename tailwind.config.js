/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VS Code Dark Theme Colors
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-editor': '#1e1e1e',
        'vscode-border': '#3e3e42',
        'vscode-hover': '#2a2d2e',
        'vscode-active': '#094771',
        'vscode-text': '#d4d4d4',
        'vscode-text-secondary': '#969696',
        'vscode-text-disabled': '#666666',
        'vscode-accent': '#007acc',
        'vscode-accent-hover': '#005a9e',
        'vscode-success': '#4ec9b0',
        'vscode-warning': '#dcdcaa',
        'vscode-error': '#d16969',
        'vscode-info': '#9cdcfe',
        
        // Custom colors for components
        'primary': '#007acc',
        'secondary': '#666666',
        'success': '#28a745',
        'warning': '#ffc107',
        'error': '#dc3545',
        'info': '#17a2b8',
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
        'sans': ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-in': 'slideIn 0.3s ease',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'vscode': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'vscode-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      borderWidth: {
        '1.5': '1.5px',
      },
    },
  },
  plugins: [],
  darkMode: 'class', // Enable dark mode
}
