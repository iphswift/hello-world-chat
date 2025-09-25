<script>
import { computed, onMounted, onUnmounted, watch } from 'vue';

// --- REPLACEMENT SCRIPT ---

/**
 * Converts a camelCase string to kebab-case.
 * e.g., backgroundColor -> background-color
 */
function toKebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Recursively builds CSS rules from a JavaScript object.
 * This new function can handle nested objects for pseudo-selectors and @-rules.
 */
function processStyleObject(obj) {
  let properties = '';
  let nestedRules = '';

  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      // Handle nested blocks like 'from', 'to', or pseudo-selectors like '&:hover'
      const selector = key.startsWith('&') ? key.substring(1) : key;
      nestedRules += `${selector} { ${processStyleObject(value)} } `;
    } else {
      // Handle regular CSS properties
      properties += `${toKebabCase(key)}: ${value}; `;
    }
  }
  return properties + nestedRules;
}

export default {
  name: 'DynamicStyles',
  props: {
    styles: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const stylesheetContent = computed(() => {
      let finalCss = '';
      for (const key in props.styles) {
        const styleObj = props.styles[key];
        if (key.startsWith('@keyframes')) {
          // Handle @keyframes rule
          finalCss += `${key} { ${processStyleObject(styleObj)} } \n`;
        } else {
          // Handle regular class selector and potential pseudo-selectors within
          let classContent = '';
          let nestedRules = '';
          const baseSelector = `.${key}`;

          for (const prop in styleObj) {
            const value = styleObj[prop];
            // Check for pseudo-selectors like 'hover', 'focus', etc.
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              nestedRules += `${baseSelector}:${prop} { ${processStyleObject(value)} } \n`;
            } else {
              classContent += `${toKebabCase(prop)}: ${value}; `;
            }
          }
          finalCss += `${baseSelector} { ${classContent}} \n`;
          finalCss += nestedRules;
        }
      }
      return finalCss;
    });

    let styleElement = null;

    onMounted(() => {
      styleElement = document.createElement('style');
      styleElement.setAttribute('type', 'text/css');
      styleElement.setAttribute('data-dynamic-styles', '');
      document.head.appendChild(styleElement);
      
      watch(stylesheetContent, (newCss) => {
        styleElement.textContent = newCss;
      }, { immediate: true });
    });

    onUnmounted(() => {
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    });

    return () => null; // Render nothing
  },
};
</script>