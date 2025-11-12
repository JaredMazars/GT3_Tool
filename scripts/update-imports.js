#!/usr/bin/env node

/**
 * Script to update import paths after directory restructuring
 * Run with: node scripts/update-imports.js
 */

const fs = require('fs');
const path = require('path');

// Define import path mappings
const importMappings = [
  // Components - Layout
  { from: '@/components/DashboardNav', to: '@/components/layout/DashboardNav' },
  { from: '@/components/UserMenu', to: '@/components/layout/UserMenu' },
  
  // Components - Features/Projects
  { from: '@/components/ProjectTypeSelector', to: '@/components/features/projects/ProjectTypeSelector' },
  { from: '@/components/CreateProjectModal', to: '@/components/features/projects/CreateProjectModal' },
  { from: '@/components/UserManagement', to: '@/components/features/projects/UserManagement' },
  
  // Components - Features/Clients
  { from: '@/components/ClientSelector', to: '@/components/features/clients/ClientSelector' },
  
  // Components - Features/Opinions
  { from: '@/components/OpinionAssistant', to: '@/components/features/opinions/OpinionAssistant' },
  
  // Components - Features/Tax Adjustments
  { from: '@/components/TaxAdjustmentCard', to: '@/components/features/tax-adjustments/TaxAdjustmentCard' },
  { from: '@/components/AddAdjustmentModal', to: '@/components/features/tax-adjustments/AddAdjustmentModal' },
  { from: '@/components/RemappingModal', to: '@/components/features/tax-adjustments/RemappingModal' },
  
  // Components - Features/Reports
  { from: '@/components/reports/', to: '@/components/features/reports/' },
  
  // Components - Shared
  { from: '@/components/FileUpload', to: '@/components/shared/FileUpload' },
  { from: '@/components/StatusBadge', to: '@/components/shared/StatusBadge' },
  { from: '@/components/ExportMenu', to: '@/components/shared/ExportMenu' },
  { from: '@/components/ProcessingModal', to: '@/components/shared/ProcessingModal' },
  { from: '@/components/DocumentUploader', to: '@/components/shared/DocumentUploader' },
  { from: '@/components/ExtractionResults', to: '@/components/shared/ExtractionResults' },
  { from: '@/components/CalculationBreakdown', to: '@/components/shared/CalculationBreakdown' },
  { from: '@/components/TaxYearInput', to: '@/components/shared/TaxYearInput' },
  
  // Lib - Utils
  { from: '@/lib/formatters', to: '@/lib/utils/formatters' },
  { from: '@/lib/validation', to: '@/lib/utils/validation' },
  { from: '@/lib/fileValidator', to: '@/lib/utils/fileValidator' },
  { from: '@/lib/retryUtils', to: '@/lib/utils/retryUtils' },
  { from: '@/lib/projectUtils', to: '@/lib/utils/projectUtils' },
  { from: '@/lib/apiUtils', to: '@/lib/utils/apiUtils' },
  { from: '@/lib/errorHandler', to: '@/lib/utils/errorHandler' },
  { from: '@/lib/logger', to: '@/lib/utils/logger' },
  { from: '@/lib/rateLimit', to: '@/lib/utils/rateLimit' },
  
  // Lib - Config
  { from: '@/lib/env', to: '@/lib/config/env' },
  { from: '@/lib/queryClient', to: '@/lib/config/queryClient' },
  
  // Lib - DB
  { from: '@/lib/prisma', to: '@/lib/db/prisma' },
  
  // Lib - Services/Auth
  { from: '@/lib/auth', to: '@/lib/services/auth/auth' },
  { from: '@/lib/graphClient', to: '@/lib/services/auth/graphClient' },
  
  // Lib - Services/Documents
  { from: '@/lib/documentExtractor', to: '@/lib/services/documents/documentExtractor' },
  { from: '@/lib/documentIntelligence', to: '@/lib/services/documents/documentIntelligence' },
  { from: '@/lib/blobStorage', to: '@/lib/services/documents/blobStorage' },
  
  // Lib - Services/Tax
  { from: '@/lib/taxAdjustmentEngine', to: '@/lib/services/tax/taxAdjustmentEngine' },
  { from: '@/lib/taxAdjustmentsGuide', to: '@/lib/services/tax/taxAdjustmentsGuide' },
  
  // Lib - Services/Opinions
  { from: '@/lib/ragEngine', to: '@/lib/services/opinions/ragEngine' },
  { from: '@/lib/sectionMapper', to: '@/lib/services/opinions/sectionMapper' },
  { from: '@/lib/aiTaxReportGenerator', to: '@/lib/services/opinions/aiTaxReportGenerator' },
  
  // Lib - Services/Export
  { from: '@/lib/exporters/excelExporter', to: '@/lib/services/export/excelExporter' },
  { from: '@/lib/exporters/wordExporter', to: '@/lib/services/export/wordExporter' },
  { from: '@/lib/pdfExporter', to: '@/lib/services/export/pdfExporter' },
  
  // Lib - Services/Projects
  { from: '@/lib/mappingGuide', to: '@/lib/services/projects/mappingGuide' },
  
  // Hooks
  { from: '@/hooks/useProjectData', to: '@/hooks/projects/useProjectData' },
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  for (const mapping of importMappings) {
    const regex = new RegExp(mapping.from.replace(/\//g, '\\/'), 'g');
    if (regex.test(content)) {
      content = content.replace(regex, mapping.to);
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${filePath}`);
    return 1;
  }
  
  return 0;
}

function processDirectory(dirPath) {
  let count = 0;
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, .git
      if (item !== 'node_modules' && item !== '.next' && item !== '.git') {
        count += processDirectory(fullPath);
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
      count += updateFile(fullPath);
    }
  }

  return count;
}

console.log('🔄 Updating import paths...\n');

const srcPath = path.join(__dirname, '..', 'src');
const filesUpdated = processDirectory(srcPath);

console.log(`\n✅ Complete! Updated ${filesUpdated} files.`);


