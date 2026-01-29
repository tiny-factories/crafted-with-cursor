# Crafted with Cursor - Bluesky Feed Generator

A custom Bluesky feed that shows:
- Posts with **#crafted-with-cursor** hashtag
- Posts from people on your curated list
- Your own posts

## Quick Setup (5 minutes)

### 1. Get the Code

Clone or download this project to your computer.

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Your App Password

1. Go to [Bluesky Settings > App Passwords](https://bsky.app/settings/app-passwords)
2. Click "Add App Password"
3. Name it "Feed Generator" and create it
4. Copy the password (you won't see it again!)

### 4. Configure Environment

Copy `.env.example` to `.env` and fill in your details:

```bash
cp .env.example .env
```

Edit `.env`:
```
BLUESKY_HANDLE=gndclouds.earth
BLUESKY_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Your app password
HOSTNAME=your-project-name.vercel.app  # We'll get this in step 6
```

### 5. Deploy to Vercel

**Option A: Via GitHub (Recommended)**

1. Push this code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "Add New Project"
4. Import your GitHub repo
5. Add these environment variables in Vercel (all three are required for the feed to work):
   - `BLUESKY_HANDLE`: your handle (e.g. gndclouds.earth)
   - `BLUESKY_PASSWORD`: your app password (from step 3)
   - `HOSTNAME`: (leave blank for now)
6. Deploy!
7. After deploy, copy your Vercel URL (e.g., `crafted-with-cursor-feed.vercel.app`)
8. Go back to Vercel settings and set `HOSTNAME` to your URL (without https://)
9. Redeploy

**Option B: Via Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel
```

### 6. Publish Your Feed to Bluesky

Once deployed, update your `.env` with the correct `HOSTNAME`, then run:

```bash
npm run publish-feed
```

This registers your feed on Bluesky. You'll see output like:
```
✅ Feed published successfully!
📋 Feed Details:
   URL: https://bsky.app/profile/gndclouds.earth/feed/crafted-with-cursor
```

### 7. Done!

Your feed is now live at:
**https://bsky.app/profile/gndclouds.earth/feed/crafted-with-cursor**

Pin it to your profile or share it with others!

---

## Customization

### Change the Hashtag

In `src/index.ts`, edit:
```typescript
const HASHTAG = 'crafted-with-cursor';  // Change to your hashtag
```

### Change the List

In `src/index.ts`, edit:
```typescript
const YOUR_LIST_URI = 'at://did:plc:xxx/app.bsky.graph.list/xxx';
```

### Change Feed Name/Description

In `scripts/publishFeedGen.ts`, edit:
```typescript
const FEED_RECORD_NAME = 'crafted-with-cursor';
const FEED_DISPLAY_NAME = 'Crafted with Cursor';
const FEED_DESCRIPTION = 'Your description here';
```

---

## Troubleshooting

**Feed shows no posts:**
- Check that your Vercel deployment is running (visit the URL)
- Make sure the hashtag exists in some posts
- Check Vercel logs for errors

**Can't publish feed:**
- Make sure you're using an App Password, not your main password
- Check that HOSTNAME matches your Vercel URL exactly

**"Internal Server Error" or "403 Forbidden" when opening the feed on Bluesky:**
- The feed server must be authenticated to call Bluesky's API (getList, searchPosts). In Vercel, set `BLUESKY_HANDLE` and `BLUESKY_PASSWORD` (your app password) in Project Settings → Environment Variables, then redeploy.

**Need help?**
Open an issue or reach out to @gndclouds.earth on Bluesky
