// js/include.js
// Simple script to include HTML fragments

async function includeHTML() {
  const includes = document.querySelectorAll('[data-include]');
  
  for (const element of includes) {
    const file = element.getAttribute('data-include');
    if (file) {
      try {
        const response = await fetch(`/includes/${file}`);
        if (response.ok) {
          const html = await response.text();
          element.innerHTML = html;
          
          // Re-run any scripts in the included HTML
          const scripts = element.querySelectorAll('script');
          scripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            document.body.appendChild(newScript);
          });
        }
      } catch (error) {
        console.error(`Failed to include ${file}:`, error);
      }
    }
  }
}

// Run on DOM load
document.addEventListener('DOMContentLoaded', includeHTML);