"use client";

import { useState, useCallback, useRef } from "react";
import type { VideoMetadata, FeedTab } from "@/types";
import { cachedENSLookup } from "./useENS";
import { getLivepeerThumbnail } from "@/lib/livepeer";

const PAGE_SIZE = 10;
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
      where: { removed: false, poster_in: $posters }
    ) {
      id
      poster
      ipfsCid
      playbackId
      caption
      timestamp
      likes
    }
  }
`;

interface SubgraphVideo {
  id: string;
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
    comments: 0,
    tips: "0",
    views: 0,
  };
}

function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#(\w+)/g);
  return matches ? matches.map((t) => t.slice(1)).slice(0, 5) : [];
}

async function querySubgraph(
  query: string,
  variables: Record<string, unknown>
): Promise<SubgraphVideo[]> {
  if (!SUBGRAPH_URL) return [];
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  return json.data?.videos ?? [];
}

export function useFeed(tab: FeedTab, followingAddresses: string[] = []) {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  const fetchVideos = useCallback(
    async (page: number, refresh = false) => {
      if (tab === "following" && followingAddresses.length === 0) {
        setVideos([]);
        setHasMore(false);
        return;
      }

      try {
        let raw: SubgraphVideo[];

        if (tab === "following") {
          raw = await querySubgraph(FOLLOWING_QUERY, {
            skip: page * PAGE_SIZE,
            first: PAGE_SIZE,
            posters: followingAddresses.slice(0, 50).map((a) => a.toLowerCase()),
          });
        } else {
          raw = await querySubgraph(VIDEOS_QUERY, {
            skip: page * PAGE_SIZE,
            first: PAGE_SIZE,
          });
        }

        const enriched = await Promise.all(
          raw.map(async (v) => {
            const mapped = mapToVideoMetadata(v);
            const ens = await cachedENSLookup(v.poster);
            return {
              ...mapped,
              posterEns: ens.name ?? undefined,
              posterAvatar: ens.avatar ?? undefined,
            };
          })
        );

        if (refresh) {
          setVideos(enriched);
        } else {
          setVideos((prev) => [...prev, ...enriched]);
        }

        setHasMore(raw.length === PAGE_SIZE);
        pageRef.current = page + 1;
      } catch (err) {
        console.error("Feed fetch error:", err);
        if (refresh) setVideos([]);
        setHasMore(false);
      }
    },
    [tab, followingAddresses]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    pageRef.current = 0;
    await fetchVideos(0, true);
    setLoading(false);
  }, [fetchVideos]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    await fetchVideos(pageRef.current);
    setLoading(false);
  }, [loading, hasMore, fetchVideos]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    pageRef.current = 0;
    await fetchVideos(0, true);
    setRefreshing(false);
  }, [fetchVideos]);

  const prependVideo = useCallback((video: VideoMetadata) => {
    setVideos((prev) => [video, ...prev]);
  }, []);

  return {
    videos,
    loading,
    refreshing,
    hasMore,
    loadInitial,
    loadMore,
    refresh,
    prependVideo,
  };
}
