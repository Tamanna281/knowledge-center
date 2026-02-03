@echo off
echo Stopping any potential Node.js processes (optional, requires user to manually stop if this doesn't work)...
REM We rely on user stopping the server mostly.

echo Generating Prisma Client...
call npx prisma generate

echo Pushing Schema to Supabase...
call npx prisma db push

echo Done! You can now run 'npm run dev'.
pause
