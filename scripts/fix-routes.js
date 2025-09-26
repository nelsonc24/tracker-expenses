#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const routeFiles = [
  'src/app/api/accounts/[id]/route.ts',
  'src/app/api/categories/[id]/route.ts', 
  'src/app/api/transactions/[id]/route.ts',
  'src/app/api/recurring-transactions/[id]/route.ts'
];

routeFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern 1: { params }: { params: { id: string } }
    content = content.replace(
      /{ params }: { params: { id: string } }/g,
      '{ params }: { params: Promise<{ id: string }> }'
    );
    
    // Pattern 2: await params.id -> const { id } = await params; // use id
    content = content.replace(
      /(\w+\.)?params\.id/g,
      (match, prefix) => {
        // Add await params destructuring if not already present
        if (!content.includes('const { id } = await params')) {
          content = content.replace(
            /(const user = await currentUser\(\)[\s\S]*?}\s*)/,
            '$1\n    const { id } = await params'
          );
        }
        return 'id';
      }
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${filePath}`);
  }
});
