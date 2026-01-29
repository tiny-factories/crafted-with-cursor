import express from 'express';
import { AtpAgent } from '@atproto/api';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configuration
const FEED_URI = process.env.FEED_URI || 'at://did:plc:YOUR_DID/app.bsky.feed.generator/crafted-with-cursor';
const PUBLISHER_DID = process.env.PUBLISHER_DID || '';
const HOSTNAME = process.env.HOSTNAME || 'your-feed.vercel.app';

// Bluesky credentials - required for feed server to call API (getList, searchPosts)
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE || '';
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD || '';

// Your settings
const YOUR_HANDLE = 'gndclouds.earth';
const YOUR_LIST_URI = 'at://did:plc:tljbuz6rbn363t6f7ht2oxwz/app.bsky.graph.list/3mdlbumvg2r2l';
const HASHTAGS = ['crafted-with-cursor', 'craftedwithcursor']; // Both variants

// Cache for list members and your DID
let listMemberDids: Set<string> = new Set();
let yourDid: string | null = null;
let listLastFetched = 0;
const LIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Authenticated agent - must use PDS (bsky.social) for login; App View (api.bsky.app) does not support createSession
const agent = new AtpAgent({
  service: 'https://bsky.social',
  headers: [['User-Agent', 'CraftedWithCursorFeed/1.0']],
});

let loginPromise: Promise<void> | null = null;

async function ensureLoggedIn(): Promise<void> {
  if (agent.hasSession) return;
  if (loginPromise) return loginPromise;
  if (!BLUESKY_HANDLE || !BLUESKY_PASSWORD) {
    throw new Error('BLUESKY_HANDLE and BLUESKY_PASSWORD must be set for the feed server to call the Bluesky API');
  }
  loginPromise = agent.login({ identifier: BLUESKY_HANDLE, password: BLUESKY_PASSWORD }).then(() => {});
  await loginPromise;
}

// Fetch list members
async function fetchListMembers(): Promise<Set<string>> {
  const now = Date.now();
  if (now - listLastFetched < LIST_CACHE_TTL && listMemberDids.size > 0) {
    return listMemberDids;
  }

  try {
    const response = await agent.app.bsky.graph.getList({ list: YOUR_LIST_URI, limit: 100 });
    const dids = new Set<string>();

    for (const item of response.data.items) {
      dids.add(item.subject.did);
    }

    listMemberDids = dids;
    listLastFetched = now;
    console.log(`Fetched ${dids.size} members from list`);
    return dids;
  } catch (error) {
    console.error('Error fetching list members:', error);
    return listMemberDids; // Return cached version on error
  }
}

// Resolve your handle to DID (cached)
async function resolveYourDid(): Promise<string | null> {
  if (yourDid) return yourDid;

  try {
    const response = await agent.resolveHandle({ handle: YOUR_HANDLE });
    yourDid = response.data.did;
    return yourDid;
  } catch (error) {
    console.error(`Error resolving handle ${YOUR_HANDLE}:`, error);
    return null;
  }
}

// Check if author is you or on your list
function isAllowedAuthor(authorDid: string, myDid: string, listMembers: Set<string>): boolean {
  return authorDid === myDid || listMembers.has(authorDid);
}

// Well-known DID document
app.get('/.well-known/did.json', (req, res) => {
  res.json({
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: `did:web:${HOSTNAME}`,
    service: [
      {
        id: '#bsky_fg',
        type: 'BskyFeedGenerator',
        serviceEndpoint: `https://${HOSTNAME}`,
      },
    ],
  });
});

// Describe feed generator
app.get('/xrpc/app.bsky.feed.describeFeedGenerator', (req, res) => {
  res.json({
    did: `did:web:${HOSTNAME}`,
    feeds: [
      {
        uri: FEED_URI,
      },
    ],
  });
});

// Get feed skeleton - this is the main feed logic
app.get('/xrpc/app.bsky.feed.getFeedSkeleton', async (req, res) => {
  try {
    await ensureLoggedIn();

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const cursor = req.query.cursor as string | undefined;

    // Resolve your DID
    const myDid = await resolveYourDid();
    if (!myDid) {
      return res.status(500).json({ error: 'Could not resolve your handle' });
    }

    // Fetch list members
    const listMembers = await fetchListMembers();

    // Search for posts with both hashtag variants
    const searchPromises = HASHTAGS.map(tag =>
      agent.app.bsky.feed.searchPosts({
        q: `#${tag}`,
        limit: 50,
        cursor: cursor,
      })
    );

    const searchResults = await Promise.all(searchPromises);

    // Combine and filter posts
    // LOGIC: Must have hashtag AND (be from you OR from someone on your list)
    const allPosts = new Map<string, any>();

    for (const result of searchResults) {
      for (const post of result.data.posts) {
        // Only include if author is you or on your list
        if (isAllowedAuthor(post.author.did, myDid, listMembers)) {
          allPosts.set(post.uri, {
            uri: post.uri,
            cid: post.cid,
            indexedAt: post.indexedAt,
          });
        }
      }
    }

    // Sort by indexedAt descending
    const sortedPosts = Array.from(allPosts.values())
      .sort((a, b) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime())
      .slice(0, limit);

    // Build feed response
    const feed = sortedPosts.map((post) => ({ post: post.uri }));

    // Use cursor from first search result
    const newCursor = searchResults[0]?.data.cursor;

    res.json({
      cursor: newCursor,
      feed,
    });
  } catch (error) {
    console.error('Error generating feed:', error);
    res.status(500).json({ error: 'Failed to generate feed' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', feed: 'Crafted with Cursor' });
});

app.listen(port, () => {
  console.log(`Feed generator listening on port ${port}`);
});

export default app;
