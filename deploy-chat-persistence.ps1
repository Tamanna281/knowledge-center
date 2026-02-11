# Deployment Script for Knowledge Center - Chat Persistence Update
# PowerShell version for Windows

Write-Host "🚀 Knowledge Center - Chat Persistence Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Pre-Deployment Checks" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Yellow

# Check if schema.prisma has the new models
$schemaContent = Get-Content "prisma\schema.prisma" -Raw
if ($schemaContent -match "model ChatConversation") {
    Write-Host "✅ ChatConversation model found in schema" -ForegroundColor Green
}
else {
    Write-Host "❌ ChatConversation model missing in schema" -ForegroundColor Red
    exit 1
}

if ($schemaContent -match "model ChatMessage") {
    Write-Host "✅ ChatMessage model found in schema" -ForegroundColor Green
}
else {
    Write-Host "❌ ChatMessage model missing in schema" -ForegroundColor Red
    exit 1
}

# Check if the API route exists
if (Test-Path "src\app\api\chat\history\route.ts") {
    Write-Host "✅ Chat history API endpoint exists" -ForegroundColor Green
}
else {
    Write-Host "❌ Chat history API endpoint missing" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔨 Building Project" -ForegroundColor Yellow
Write-Host "-------------------" -ForegroundColor Yellow

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
}
else {
    Write-Host "❌ Build failed. Please fix errors before deploying." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Git Status" -ForegroundColor Yellow
Write-Host "-------------" -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "🎯 Next Steps" -ForegroundColor Cyan
Write-Host "-------------" -ForegroundColor Cyan
Write-Host "1. Review the changes above"
Write-Host "2. Commit your changes:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Gray
Write-Host '   git commit -m "Add chat history persistence feature"' -ForegroundColor Gray
Write-Host "3. Push to GitHub:" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Update Vercel Build Command to:" -ForegroundColor White
Write-Host "   npx prisma db push --accept-data-loss `&`& next build" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Monitor Vercel deployment at:" -ForegroundColor White
Write-Host "   https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Deployment preparation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📄 Documentation files created:" -ForegroundColor Cyan
Write-Host "   - CHAT_PERSISTENCE_SUMMARY.md (Quick reference)"
Write-Host "   - CHAT_PERSISTENCE_UPDATE.md (Detailed technical docs)"
Write-Host "   - DEPLOYMENT_GUIDE.md (Updated with migration steps)"
