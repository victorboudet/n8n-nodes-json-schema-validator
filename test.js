/**
 * Automatic HTML to Template Converter
 * 
 * This script takes raw HTML and automatically converts it to a template
 * by replacing text content, image sources, and other data with variables.
 * It also generates the corresponding JSON structure.
 */

// Sample HTML content to process
const htmlContent = `
<div class="product-card">
  <div class="product-header">
    <img src="/images/smartphone-x200.jpg" alt="Smartphone X200" class="product-image">
    <h2 class="product-name">Smartphone X200</h2>
    <div class="product-price">$799.99</div>
  </div>
  <div class="product-details">
    <p class="product-description">The latest smartphone with amazing features and long battery life.</p>
    <ul class="product-features">
      <li>6.7-inch OLED display</li>
      <li>Triple camera system</li>
      <li>All-day battery life</li>
      <li>Water resistant</li>
    </ul>
    <div class="product-cta">
      <button class="buy-button">Add to Cart</button>
    </div>
  </div>
</div>
`;

// Function to convert HTML to a template with variables
function htmlToTemplate(html) {
  // Create a DOMParser to parse the HTML (would use a library like cheerio in Node.js)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Store generated variable names and their values
  const variables = {};
  let variableCounter = 0;
  
  // Process text nodes
  function processTextNodes(element, parentKey = '') {
    // Skip script and style tags
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
      return;
    }
    
    // Process child elements
    Array.from(element.childNodes).forEach(node => {
      // Text node with actual content (not just whitespace)
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const text = node.textContent.trim();
        if (text.length > 0) {
          // Generate a variable name based on context or parent elements
          let varName;
          const parentElement = node.parentElement;
          
          if (parentElement) {
            // Try to create semantic variable names
            if (parentElement.tagName === 'H1' || parentElement.tagName === 'H2' || 
                parentElement.tagName === 'H3' || parentElement.tagName === 'H4') {
              varName = 'title';
            } else if (parentElement.tagName === 'P') {
              varName = 'description';
            } else if (parentElement.tagName === 'LI') {
              // For lists, use an array variable for the parent UL/OL
              const listParent = parentElement.parentElement;
              if (listParent && (listParent.tagName === 'UL' || listParent.tagName === 'OL')) {
                const listClass = listParent.className || 'items';
                const listVarName = convertToVarName(listClass);
                
                // If the list variable doesn't exist yet, create it
                if (!variables[listVarName]) {
                  variables[listVarName] = [];
                }
                
                // Add the item to the list and replace in HTML
                variables[listVarName].push(text);
                node.textContent = node.textContent.replace(text, '{{this}}');
                
                // Mark this parent for each loop later
                if (!listParent.hasAttribute('data-template-var')) {
                  listParent.setAttribute('data-template-var', listVarName);
                }
                
                return; // Skip further processing for list items
              }
              varName = 'item';
            } else if (parentElement.className) {
              varName = convertToVarName(parentElement.className);
            } else {
              varName = parentElement.tagName.toLowerCase() + 'Content';
            }
            
            // Add a suffix for uniqueness if needed
            if (variables[varName] !== undefined) {
              varName = varName + (++variableCounter);
            }
            
            // Store the variable and value
            variables[varName] = text;
            
            // Replace the text with the variable placeholder
            node.textContent = node.textContent.replace(text, `{{${varName}}}`);
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Handle elements
        
        // Process image tags
        if (node.tagName === 'IMG') {
          const src = node.getAttribute('src');
          const alt = node.getAttribute('alt');
          
          if (src) {
            const srcVarName = convertToVarName(node.className || 'image') + 'Src';
            variables[srcVarName] = src;
            node.setAttribute('src', `{{${srcVarName}}}`);
          }
          
          if (alt) {
            const altVarName = convertToVarName(node.className || 'image') + 'Alt';
            variables[altVarName] = alt;
            node.setAttribute('alt', `{{${altVarName}}}`);
          }
        }
        
        // Process other attributes that might contain content
        if (node.tagName === 'A' && node.getAttribute('href')) {
          const href = node.getAttribute('href');
          if (!href.startsWith('#') && !href.startsWith('javascript:')) {
            const hrefVarName = convertToVarName(node.className || 'link') + 'Url';
            variables[hrefVarName] = href;
            node.setAttribute('href', `{{${hrefVarName}}}`);
          }
        }
        
        // Recursively process child elements
        processTextNodes(node, parentKey);
      }
    });
  }
  
  // Process the HTML
  processTextNodes(doc.body);
  
  // Post-process for list templates
  function applyListTemplates(element) {
    const lists = element.querySelectorAll('ul[data-template-var], ol[data-template-var]');
    
    lists.forEach(list => {
      const varName = list.getAttribute('data-template-var');
      
      // Get the first list item as template
      const templateItem = list.querySelector('li');
      if (templateItem) {
        // Store the template item HTML
        const itemTemplate = templateItem.outerHTML;
        
        // Remove all list items
        while (list.firstChild) {
          list.removeChild(list.firstChild);
        }
        
        // Add the each loop template syntax
        const eachLoopHTML = `
          {{#each ${varName}}}
            ${itemTemplate}
          {{/each}}
        `;
        
        list.innerHTML = eachLoopHTML;
      }
      
      // Remove the temporary attribute
      list.removeAttribute('data-template-var');
    });
  }
  
  applyListTemplates(doc.body);
  
  // Get the template HTML
  const templateHTML = doc.body.innerHTML;
  
  return {
    templateHTML: templateHTML.trim(),
    variables: variables
  };
}

// Convert a class name to a camelCase variable name
function convertToVarName(className) {
  // Get the first class if there are multiple
  const firstClass = className.split(' ')[0]; 
  
  // Convert kebab-case to camelCase
  return firstClass.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

// Generate the template and data
const result = htmlToTemplate(htmlContent);

console.log("GENERATED TEMPLATE HTML:");
console.log(result.templateHTML);
console.log("\nGENERATED JSON DATA:");
console.log(JSON.stringify(result.variables, null, 2));

// Function to render the template with data
function renderTemplate(template, data) {
  let result = template;
  
  // Replace simple variables
  for (const key in data) {
    if (Array.isArray(data[key])) continue; // Skip arrays for now
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, data[key]);
  }
  
  // Handle each loops
  Object.keys(data).forEach(key => {
    if (Array.isArray(data[key])) {
      const eachStartRegex = new RegExp(`{{#each ${key}}}([\\s\\S]*?){{\/each}}`, 'g');
      const matches = template.match(eachStartRegex);
      
      if (matches) {
        let itemTemplate = '';
        const fullMatchRegex = new RegExp(`{{#each ${key}}}([\\s\\S]*?){{\/each}}`);
        const fullMatch = fullMatchRegex.exec(template);
        
        if (fullMatch && fullMatch[1]) {
          itemTemplate = fullMatch[1].trim();
          const renderedItems = data[key].map(item => 
            itemTemplate.replace(/{{this}}/g, item)
          ).join('');
          
          result = result.replace(eachStartRegex, renderedItems);
        }
      }
    }
  });
  
  return result;
}

// Create a modified version of the JSON data
const modifiedData = { ...result.variables };
modifiedData.productName = "Smartphone X300 Pro";
modifiedData.productPrice = "$999.99";
modifiedData.productDescription = "Our flagship model with the fastest processor and incredible battery life.";
modifiedData.productFeatures = [
  "6.9-inch Super AMOLED display",
  "Quad camera system with 108MP main sensor",
  "48 hours of battery life",
  "IP68 water and dust resistance",
  "5G connectivity"
];

// Render the template with the modified data
const renderedHTML = renderTemplate(result.templateHTML, modifiedData);

console.log("\nRENDERED HTML WITH MODIFIED DATA:");
console.log(renderedHTML);