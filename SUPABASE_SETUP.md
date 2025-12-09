# Supabase Setup Guide - Easy Database Solution

## Why Supabase?
- ✅ **Free tier** - Perfect for assignments
- ✅ **PostGIS pre-installed** - No configuration needed
- ✅ **Simple setup** - Just copy connection string
- ✅ **No migration issues** - Fresh database every time

## Step-by-Step Setup

### 1. Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (easiest)
4. Create a new project
   - Name: `community-event-locator`
   - Database password: (save this!)
   - Region: Choose closest to you

### 2. Get Database Connection Info
1. In your Supabase project, go to **Settings** → **Database**
2. Scroll to **Connection string** → **URI**
3. Copy the connection string (looks like: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)

### 3. Update Railway Environment Variables
1. Go to Railway → your web service
2. Go to **Variables** tab
3. Add/Update these variables:

```
POSTGRES_HOST=db.xxxxx.supabase.co
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_DB=postgres
POSTGRES_PASSWORD=[your-supabase-password]
```

Replace `xxxxx` with your actual Supabase project ID.

### 4. Enable PostGIS (Automatic!)
Supabase has PostGIS pre-installed, but you need to enable it:
1. Go to Supabase → **SQL Editor**
2. Run this command:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
3. Click "Run"

### 5. Redeploy on Railway
1. Railway should auto-detect the new database
2. Or manually redeploy your web service
3. Watch the logs - migrations should run cleanly!

## That's It!

Your app will now use Supabase instead of Railway's database. No more PostGIS errors, no more migration conflicts!

## Benefits
- ✅ PostGIS works immediately
- ✅ Fresh database = no migration conflicts
- ✅ Free tier is generous
- ✅ Easy to reset if needed

