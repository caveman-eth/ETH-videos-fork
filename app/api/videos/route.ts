export const dynamic = "force-static";
import { NextRequest, NextResponse } from "next/server";
import type { VideoMetadata } from "@/types";
import { getLivepeerThumbnail } from "@/lib/livepeer";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL;

const VIDEOS_QUERY = `
  query GetVideos($skip: Int!, $first: Int!) {
    videos(
      skip: $skip
      first: $first
      orderBy: timestamp
      orderDirection: desc
      where: { removed: false }
    ) {
      id
      tokenId
      poster
      ipfsCid
      playbackId
      caption
      timestamp
      likes
    }
  }
`;

const POSTER_QUERY = `
  query GetPosterVideos($skip: Int!, $first: Int!, $poster: Bytes!) {
    videos(
      skip: $skip
      first: $first
      orderBy: timestamp
      orderDirection: desc
      where: { removed: false, poster: $poster }
    ) {
      id
      tokenId
      poster
      ipfsCid
      playbackId
      caption
      timestamp
      likes
    }
  }
`;

const FOLLOWING_QUERY = `
  query GetFollowingVideos($skip: Int!, $first: Int!, $posters: [Bytes!]!) {
    videos(
      skip: $skip
      first: $first
      orderBy: timestamp
      orderDirection: desc
      where: {
        removed: false
        poster_in: $posters
      }
    ) {
      id
      tokenId
      poster
      ipfsCid
      playbackId
      caption
      timestamp
      likes
    }
  }
`;

async function querySubgraph(
  query: string,
  variables: Record<string, unknown>
): Promise<{ data?: { videos: SubgraphVideo[] }; errors?: unknown[] }> {
  const res = await fetch(SUBGRAPH_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 10 }, // cache for 10s
  });
  return res.json();
}

interface SubgraphVideo {
  id: string;
  tokenId: string;
  poster: string;
  ipfsCid: string;
  playbackId: string;
  caption: string;
  timestamp: string;
  likes: string;
}

function mapToVideoMetadata(v: SubgraphVideo): VideoMetadata {
  return {
    cid: v.ipfsCid,
    playbackId: v.playbackId,
    thumbnailUrl: v.playbackId ? getLivepeerThumbnail(v.playbackId) : "",
    caption: v.caption,
    hashtags: extractHashtags(v.caption),
    duration: 0,
    poster: v.poster,
    timestamp: parseInt(v.timestamp),
    likes: parseInt(v.likes),
    comments: 0,   // fetched separately via comments API
    tips: "0",     // fetched separately via on-chain events
    views: 0,
  };
}

function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#(\w+)/g);
  return matches ? matches.map((t) => t.slice(1)).slice(0, 5) : [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") || "for-you";
  const page = parseInt(searchParams.get("page") || "0");
  const limit = parseInt(searchParams.get("limit") || "10");
  const following = searchParams.get("following")?.split(",").filter(Boolean) || [];
  const poster = searchParams.get("poster")?.toLowerCase() || null;

  if (!SUBGRAPH_URL) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    let result;

    if (poster) {
      result = await querySubgraph(POSTER_QUERY, {
        skip: page * limit,
        first: limit,
        poster,
      });
    } else if (tab === "following" && following.length > 0) {
      result = await querySubgraph(FOLLOWING_QUERY, {
        skip: page * limit,
        first: limit,
        posters: following.map((a) => a.toLowerCase()),
      });
    } else {
      result = await querySubgraph(VIDEOS_QUERY, {
        skip: page * limit,
        first: limit,
      });
    }

    if (result.errors?.length) {
      console.error("Subgraph errors:", result.errors);
      return NextResponse.json(
        { error: "Subgraph query failed" },
        { status: 502 }
      );
    }

    const videos = (result.data?.videos ?? []).map(mapToVideoMetadata);
    return NextResponse.json(videos);
  } catch (error) {
    console.error("Videos API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

