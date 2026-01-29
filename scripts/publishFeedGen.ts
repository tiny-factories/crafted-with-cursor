import { AtpAgent, BlobRef } from '@atproto/api';
import dotenv from 'dotenv';

dotenv.config();

const HANDLE = process.env.BLUESKY_HANDLE || '';
const PASSWORD = process.env.BLUESKY_PASSWORD || '';
const HOSTNAME = process.env.HOSTNAME || '';

// Feed configuration
const FEED_RECORD_NAME = 'crafted-with-cursor';
const FEED_DISPLAY_NAME = 'Crafted with Cursor';
const FEED_DESCRIPTION = 'Posts tagged #crafted-with-cursor, plus posts from my curated list and my own posts';

async function main() {
  if (!HANDLE || !PASSWORD || !HOSTNAME) {
    console.error('Missing required environment variables!');
    console.error('Please set BLUESKY_HANDLE, BLUESKY_PASSWORD, and HOSTNAME in your .env file');
    process.exit(1);
  }

  const agent = new AtpAgent({ service: 'https://bsky.social' });

  console.log('Logging in...');
  await agent.login({ identifier: HANDLE, password: PASSWORD });

  const did = agent.session?.did;
  if (!did) {
    throw new Error('Failed to get DID after login');
  }
  console.log(`Logged in as ${HANDLE} (${did})`);

  // Check if feed already exists
  try {
    const existingFeed = await agent.api.app.bsky.feed.getFeedGenerator({
      feed: `at://${did}/app.bsky.feed.generator/${FEED_RECORD_NAME}`,
    });
    console.log('Feed already exists, updating...');
  } catch (e) {
    console.log('Feed does not exist yet, creating...');
  }

  // Create/update the feed generator record
  console.log('Publishing feed generator...');

  const feedGenRecord = {
    repo: did,
    collection: 'app.bsky.feed.generator',
    rkey: FEED_RECORD_NAME,
    record: {
      did: `did:web:${HOSTNAME}`,
      displayName: FEED_DISPLAY_NAME,
      description: FEED_DESCRIPTION,
      createdAt: new Date().toISOString(),
    },
  };

  await agent.api.com.atproto.repo.putRecord(feedGenRecord);

  console.log('\n✅ Feed published successfully!');
  console.log('\n📋 Feed Details:');
  console.log(`   URI: at://${did}/app.bsky.feed.generator/${FEED_RECORD_NAME}`);
  console.log(`   URL: https://bsky.app/profile/${HANDLE}/feed/${FEED_RECORD_NAME}`);
  console.log(`\n🔧 Add these to your .env file:`);
  console.log(`   PUBLISHER_DID=${did}`);
  console.log(`   FEED_URI=at://${did}/app.bsky.feed.generator/${FEED_RECORD_NAME}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
