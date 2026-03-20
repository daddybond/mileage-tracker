# Deployment Guide: Go Public with Vercel

To use this app on your iPhone anywhere (not just at home), you should deploy it to a service like **Vercel**. It's free and perfect for Next.js apps.

## Prerequisites
- A **GitHub** account.
- A **Vercel** account (sign up with GitHub).

## Step 1: Push Code to GitHub
1. Create a new repository on GitHub (e.g., `mileage-tracker`).
2. Follow the instructions to push your local code:
   ```bash
   git add .
   git commit -m "Deploying to Vercel"
   git push origin main
   ```

## Step 2: Import to Vercel
1. Go to [Vercel](https://vercel.com/new).
2. Find your `mileage-tracker` repository and click **Import**.
3. **Crucial**: Expand the **Environment Variables** section.
4. Copy-paste EVERY key from your local `.env.local` file into Vercel:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_MAPS_API_KEY`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_BASE_URL` (Set this to your Vercel URL, e.g., `https://my-app.vercel.app`)
5. Click **Deploy**.

## Step 3: Update Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Edit your OAuth Client ID.
3. Add your new Vercel URL to:
   - **Authorized JavaScript origins**: `https://my-app.vercel.app`
   - **Authorized redirect URIs**: `https://my-app.vercel.app/api/auth/google/callback`

### Success!
Once Vercel finishes, you can visit the the site on your iPhone and repeat the "Add to Home Screen" steps using your new public URL! limit" mode:AGENT_MODE_VERIFICATION
