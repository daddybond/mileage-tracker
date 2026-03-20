# Final Step: Getting your App Online (Vercel)

Follow these 4 steps at [Vercel.com](https://vercel.com/daddybond/projects).

### 1. Start the Import
1. Click **"Add New..."** (top right) -> **"Project"**.
2. Find **`mileage-tracker`** and click **Import**.

### 2. Add your Secret Keys
1. Scroll down to **Environment Variables**.
2. Open the file `.env.local` on your Mac (it's in your project folder).
3. Copy **EVERYTHING** inside that file.
4. Paste it all into the **"Key"** box in Vercel. It will automatically split them into the right places.

### 3. Deploy
1. Click the blue **"Deploy"** button.
2. Wait for it to finish and **Copy the new website link** it gives you.

### 4. Update Google Login
1. Go to [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials).
2. Click the **Pencil icon** to edit your Client ID.
3. Add your new Vercel link to **"Authorized JavaScript origins"**.
4. Add your new Vercel link + `/api/auth/google/callback` to **"Authorized redirect URIs"**.
5. Click **Save**.

Your app is now ready to use on your iPhone! limit" mode:AGENT_MODE_VERIFICATION
