const { Project } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
  skipAddingFilesFromTsConfig: true
});

project.addSourceFilesAtPaths('src/**/*.ts');
project.addSourceFilesAtPaths('src/**/*.tsx');

const sourceFiles = project.getSourceFiles();

for (const sourceFile of sourceFiles) {
  let changed = false;

  // 1. Remove recursive imports in tokens.ts
  if (sourceFile.getFilePath().endsWith('tokens.ts')) {
     const imports = sourceFile.getImportDeclarations();
     for (const imp of imports) {
         if (imp.getModuleSpecifierValue().includes('theme/tokens')) {
             imp.remove();
             changed = true;
         }
     }
  }

  // 2. Fix Duplicate 'Theme' and 'C' imports
  const imports = sourceFile.getImportDeclarations();
  let themeImported = false;
  let cImported = false;
  let useNavImported = false;
  
  for (const imp of imports) {
     const moduleValue = imp.getModuleSpecifierValue();
     
     if (moduleValue.includes('theme/tokens')) {
         const namedImports = imp.getNamedImports();
         for (const named of namedImports) {
             const name = named.getName();
             if (name === 'Theme') {
                 if (themeImported) named.remove();
                 else themeImported = true;
             }
             if (name === 'C') {
                 if (cImported) named.remove();
                 else cImported = true;
             }
         }
         if (imp.getNamedImports().length === 0 && !imp.getDefaultImport()) {
             imp.remove();
             changed = true;
         } else {
             changed = true;
         }
     }
     
     if (moduleValue === '@react-navigation/native') {
         const namedImports = imp.getNamedImports();
         for (const named of namedImports) {
             const name = named.getName();
             if (name === 'useNavigation') {
                 if (useNavImported) named.remove();
                 else useNavImported = true;
             }
         }
         if (imp.getNamedImports().length === 0 && !imp.getDefaultImport()) {
             imp.remove();
             changed = true;
         } else {
             changed = true;
         }
     }
  }

  // 3. Fix Duplicate 'navigation' declarations
  // Find variables named 'navigation'
  const components = sourceFile.getFunctions();
  for (const comp of components) {
      const vars = comp.getVariableDeclarations();
      let navCount = 0;
      for (const v of vars) {
          if (v.getName() === 'navigation') {
              navCount++;
              if (navCount > 1) {
                  v.getVariableStatement().remove();
                  changed = true;
              }
          }
      }
      
      // Also check if navigation is in parameters
      const params = comp.getParameters();
      let hasNavParam = false;
      for (const p of params) {
          const typeNode = p.getTypeNode();
          if (typeNode && typeNode.getText().includes('NavigationProp') || p.getText().includes('navigation')) {
              hasNavParam = true;
          }
      }
      
      if (hasNavParam) {
          for (const v of vars) {
             if (v.getName() === 'navigation') {
                 v.getVariableStatement().remove();
                 changed = true;
             }
          }
      }
  }

  // Same for Arrow Functions
  const varDecls = sourceFile.getVariableDeclarations();
  for (const v of varDecls) {
      const init = v.getInitializer();
      if (init && (init.getKindName() === 'ArrowFunction' || init.getKindName() === 'FunctionExpression')) {
          const params = init.getParameters();
          let hasNavParam = false;
          for (const p of params) {
             if (p.getText().includes('navigation')) hasNavParam = true;
          }
          const innerVars = init.getVariableDeclarations ? init.getVariableDeclarations() : [];
          // It's getting complicated to write reliable AST for arrow functions in a quick script
          // Let's just catch the obvious duplicates.
      }
  }

  if (changed) {
     sourceFile.saveSync();
  }
}
