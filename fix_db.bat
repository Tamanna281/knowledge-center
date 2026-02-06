@echo off
echo Fixing database...
npx prisma generate
npx prisma db push
echo Done.
pause
