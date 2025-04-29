const { JSDOM } = require('jsdom');
const fs = require('fs');

/**
 * Extract text content, image sources and alt text from HTML,
 * replace with variables, and generate mapping JSON
 */
function extractContentFromHtml(htmlContent) {
  // Create a DOM using jsdom
  const dom = new JSDOM(htmlContent);
  const doc = dom.window.document;
  
  // Create a mapping object for the JSON output
  const contentMapping = {};
  let variableCounter = 1;
  
  // Function to process text nodes
  function processNode(node) {
    // Skip comment nodes
    if (node.nodeType === 8) { // COMMENT_NODE
      return;
    }
    // Process text nodes that have non-whitespace content
    if (node.nodeType === 3 && node.textContent.trim()) { // TEXT_NODE
      const originalText = node.textContent;
      const variableName = `TEXT_${variableCounter}`;
      
      // Replace the text with the variable
      node.textContent = `{{${variableName}}}`;
      
      // Add to our mapping
      contentMapping[variableName] = originalText;
      
      variableCounter++;
      return;
    }
    
    // Process image elements for src and alt attributes
    if (node.nodeName === 'IMG') {
      // Handle src attribute
      if (node.hasAttribute('src')) {
        const originalSrc = node.getAttribute('src');
        const srcVarName = `IMG_SRC_${variableCounter}`;
        
        node.setAttribute('src', `{{${srcVarName}}}`);
        contentMapping[srcVarName] = originalSrc;
        
        if (node.hasAttribute('alt')) {
          const originalAlt = node.getAttribute('alt');
          const altVarName = `IMG_ALT_${variableCounter}`;
          
          node.setAttribute('alt', `{{${altVarName}}}`);
          contentMapping[altVarName] = originalAlt;
        }

        variableCounter++;
      }
    }
    
    // Process child nodes recursively
    if (node.childNodes && node.childNodes.length > 0) {
      // Create a copy of childNodes to avoid issues with live NodeList during modification
      const childNodes = Array.from(node.childNodes);
      childNodes.forEach(child => processNode(child));
    }
  }
  
  // Start processing from the body element (or the entire document if body isn't available)
  processNode(doc.body || doc);
  
  // Get the modified HTML
  const modifiedHtml = doc.documentElement ? 
    dom.serialize() : 
    (doc.body ? doc.body.innerHTML : dom.serialize());
  
  return {
    modifiedHtml,
    contentMapping
  };
}

// Example usage with file I/O
function processHtmlFile(inputFilePath, outputHtmlPath, outputJsonPath) {
  const htmlContent = fs.readFileSync(inputFilePath, 'utf8');
  const result = extractContentFromHtml(htmlContent);
  
  fs.writeFileSync(outputHtmlPath, result.modifiedHtml);
  fs.writeFileSync(outputJsonPath, JSON.stringify(result.contentMapping, null, 2));
  
  console.log(`Processed HTML saved to ${outputHtmlPath}`);
  console.log(`Content mapping JSON saved to ${outputJsonPath}`);
  
  return result;
}


// Command line usage
if (typeof require !== 'undefined' && require.main === module) {
  if (process.argv.length < 5) {
    console.log('Usage: node script.js <input.html> <output.html> <output.json>');
    process.exit(1);
  }
  
  processHtmlFile(process.argv[2], process.argv[3], process.argv[4]);
} else if (typeof module !== 'undefined' && module.exports) {
  // Export for Node.js
  module.exports = {
    extractContentFromHtml,
    processHtmlFile
  };
}
