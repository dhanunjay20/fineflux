# Migration Script: Update all pages to use API_CONFIG and logger
# Run this from the project root: C:\Users\dhanu\GitHub\fineflux

$pages = @(
    'AllEmployeeTasks', 'DailyDuties', 'DailyDutiesHistory', 'Documents', 
    'EmployeeDutyInfo', 'EmployeeSetDuty', 'EmployeeTaskHistory', 'Expenses',
    'GunInfo', 'Inventory', 'InventoryHistory', 'OnboardOrganization',
    'Products', 'Profile', 'SalesHistory', 'Settings', 'SpecialDuties',
    'SpecialDutiesHistory', 'StockRegisterPage', 'EmployeeAttendance'
)

foreach ($page in $pages) {
    $filePath = "src\pages\$page.tsx"
    
    if (Test-Path $filePath) {
        Write-Host "Processing $page.tsx..." -ForegroundColor Yellow
        
        $content = Get-Content $filePath -Raw
        
        # Step 1: Add imports if not present
        if ($content -notmatch "import.*API_CONFIG") {
            $content = $content -replace "(import.*from '@/hooks/use-toast';)", "`$1`nimport { API_CONFIG } from '@/lib/api-config';`nimport { logger } from '@/lib/logger';"
        }
        
        # Step 2: Replace API_BASE references
        $content = $content -replace '\$\{API_BASE\}', '${API_CONFIG.BASE_URL}'
        $content = $content -replace 'API_BASE\/', 'API_CONFIG.BASE_URL/'
        $content = $content -replace '`\$\{API_BASE\}', '`${API_CONFIG.BASE_URL}'
        
        # Step 3: Replace console.log with logger.debug
        $content = $content -replace 'console\.log\(', 'logger.debug('
        
        # Step 4: Replace console.error with logger.error
        $content = $content -replace 'console\.error\(', 'logger.error('
        
        # Step 5: Replace console.warn with logger.warn
        $content = $content -replace 'console\.warn\(', 'logger.warn('
        
        # Step 6: Add timeout to axios calls
        $content = $content -replace 'axios\.get\(([^,]+)\)', 'axios.get($1, { timeout: API_CONFIG.TIMEOUT })'
        $content = $content -replace 'axios\.post\(([^,]+),\s*([^,]+)\)', 'axios.post($1, $2, { timeout: API_CONFIG.TIMEOUT })'
        $content = $content -replace 'axios\.put\(([^,]+),\s*([^,]+)\)', 'axios.put($1, $2, { timeout: API_CONFIG.TIMEOUT })'
        $content = $content -replace 'axios\.delete\(([^,]+)\)', 'axios.delete($1, { timeout: API_CONFIG.TIMEOUT })'
        
        # Fix double timeout if already present
        $content = $content -replace ',\s*\{\s*timeout:\s*\d+\s*\}\s*,\s*\{\s*timeout:\s*API_CONFIG\.TIMEOUT\s*\}', ', { timeout: API_CONFIG.TIMEOUT }'
        
        # Write back
        Set-Content -Path $filePath -Value $content
        
        Write-Host "✓ Completed $page.tsx" -ForegroundColor Green
    } else {
        Write-Host "✗ File not found: $filePath" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Migration complete! Please review the changes." -ForegroundColor Cyan
Write-Host "Run npm run build to check for TypeScript errors." -ForegroundColor Cyan