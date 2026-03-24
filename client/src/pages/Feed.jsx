import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { postAPI } from "../services/api";
import PageShell from "../components/common/PageShell";
import PostCard from "../components/post/PostCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { FiFilter, FiTrendingUp, FiClock, FiStar, FiZap, FiChevronDown } from "react-icons/fi";
import * as Tabs from "@radix-ui/react-tabs";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "../components/ui/Button";

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended", icon: <FiZap className="w-4 h-4" /> },
  { value: "recent", label: "Recent", icon: <FiClock className="w-4 h-4" /> },
  { value: "popular", label: "Popular", icon: <FiStar className="w-4 h-4" /> },
  { value: "trending", label: "Trending", icon: <FiTrendingUp className="w-4 h-4" /> },
];

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarData, setSidebarData] = useState({
    aiPicks: [],
    trendingDiscussions: [],
    topUsers: [],
  });
  const [filters, setFilters] = useState({
    type: "all",
    sortBy: "recommended",
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const observer = useRef();
  const lastPostElementRef = useRef();

  const getTimeAgo = (date) => {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const fetchSidebarData = useCallback(async () => {
    try {
      const [personalizedRes, trendingRes, popularRes] = await Promise.allSettled([
        postAPI.getPersonalizedFeed({ limit: 6 }),
        postAPI.getPosts({ sortBy: "trending", limit: 6, page: 1, status: "published" }),
        postAPI.getPosts({ sortBy: "popular", limit: 20, page: 1, status: "published" }),
      ]);

      const personalizedPosts =
        personalizedRes.status === "fulfilled" ? (personalizedRes.value.data?.posts || []) : [];
      const trendingPosts =
        trendingRes.status === "fulfilled" ? (trendingRes.value.data?.posts || []) : [];
      const popularPosts =
        popularRes.status === "fulfilled" ? (popularRes.value.data?.posts || []) : [];

      const aiPicks = personalizedPosts.slice(0, 3).map((post) => ({
        id: post._id,
        title: post.title,
        subject: (post.tags && post.tags[0]) || post.type || "general",
        subjectColor: post.type === "question" ? "#0A66C2" : post.type === "note" ? "#0DD3BB" : "#FF8A00",
        timeAgo: getTimeAgo(post.createdAt),
      }));

      const trendingDiscussions = trendingPosts.slice(0, 3).map((post) => ({
        id: post._id,
        title: post.title,
        commentCount: Number(post.answerCount || 0),
      }));

      const byAuthor = new Map();
      popularPosts.forEach((post) => {
        const author = post.authorId;
        if (!author?._id) return;
        const current = byAuthor.get(author._id) || {
          id: author._id,
          name: author.username || "User",
          avatar: author.avatar,
          reputation: author.reputation || 0,
          repDelta: 0,
        };
        current.repDelta += Number(post.upvotes || 0);
        byAuthor.set(author._id, current);
      });

      const topUsers = Array.from(byAuthor.values())
        .sort((a, b) => b.repDelta - a.repDelta || b.reputation - a.reputation)
        .slice(0, 3)
        .map((u) => ({ ...u, repDelta: Math.max(1, u.repDelta) }));

      setSidebarData({ aiPicks, trendingDiscussions, topUsers });
    } catch {
      setSidebarData({ aiPicks: [], trendingDiscussions: [], topUsers: [] });
    }
  }, []);

  useEffect(() => {
    fetchSidebarData();
  }, [fetchSidebarData]);

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchPosts = useCallback(async (pageNum, append = false) => {
    try {
      setLoading(true);
      const params = {
        page: pageNum,
        limit: 10,
        sortBy: filters.sortBy,
      };

      if (filters.type !== "all") {
        params.type = filters.type;
      }

      const shouldUseHybrid = filters.sortBy === "recommended" && filters.type === "all";
      const response = shouldUseHybrid
        ? await postAPI.getHybridFeed(params)
        : await postAPI.getPosts(params);

      // Enforce type filter client-side as a safety net for endpoints that may return mixed content.
      const requestedType = filters.type?.toLowerCase();
      const normalizedPosts = (response.data.posts || []).filter((post) => {
        if (requestedType === "all") return true;
        return String(post?.type || "").toLowerCase() === requestedType;
      });

      if (append) {
        setPosts((prev) => [...prev, ...normalizedPosts]);
      } else {
        setPosts(normalizedPosts);
      }

      setHasMore(
        response.data.pagination.currentPage <
          response.data.pagination.totalPages,
      );
      setPage(pageNum);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPosts(page + 1, true);
    }
  }, [loading, hasMore, page, fetchPosts]);

  useEffect(() => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    const callback = (entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    };

    observer.current = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: "100px",
    });

    if (lastPostElementRef.current) {
      observer.current.observe(lastPostElementRef.current);
    }

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loading, hasMore, loadMore]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === filters.sortBy)?.label || "Sort";

  return (
    <PageShell rightSidebarProps={sidebarData}>
      <div className="flex flex-col gap-4 pb-12">
        {/* Create Post Prompt / Header */}
        <div className="bg-white rounded-xl shadow-card border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Your Feed</h1>
            <p className="text-sm text-text-secondary mt-0.5">Discover the latest academic discussions</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/create-post')} className="shrink-0">
            Start a post
          </Button>
        </div>

        {/* AI Recommendation Banner */}
        {filters.sortBy === "recommended" && (
          <div className="bg-gradient-to-r from-primary-light/50 to-white border border-primary/20 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <FiZap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">For You</h3>
              <p className="text-xs text-text-secondary mt-1 max-w-[90%]">
                Posts personalized based on your tags, engagement, and trending academic topics.
              </p>
            </div>
          </div>
        )}

        {/* Filters Bar: Radix Tabs for Type + Dropdown for Sort */}
        <div className="bg-white rounded-xl shadow-card border border-border px-1 py-1 sticky top-[72px] z-20">
          <Tabs.Root 
            value={filters.type} 
            onValueChange={(val) => handleFilterChange("type", val)}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          >
            <Tabs.List className="flex items-center overflow-x-auto hide-scrollbar gap-1 p-1">
              {[{ value: "all", label: "All Topics" }, { value: "question", label: "Questions" }, { value: "note", label: "Notes" }, { value: "article", label: "Articles" }].map(tab => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className={`
                    px-4 py-2 text-sm font-semibold rounded-lg transition-all flex-shrink-0
                    data-[state=active]:bg-bg-secondary data-[state=active]:text-text-primary
                    data-[state=inactive]:text-text-secondary data-[state=inactive]:hover:bg-bg-secondary/50 data-[state=inactive]:hover:text-text-primary
                    outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                  `}
                >
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            
            <div className="px-2 pb-2 sm:pb-0 sm:pr-2 flex items-center justify-end">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-text-secondary hover:bg-bg-secondary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-w-max">
                    <FiFilter className="w-4 h-4" />
                    <span>{currentSortLabel}</span>
                    <FiChevronDown className="w-4 h-4 opacity-50" />
                  </button>
                </DropdownMenu.Trigger>
                
                <DropdownMenu.Portal>
                  <DropdownMenu.Content 
                    align="end" 
                    sideOffset={5}
                    className="z-50 min-w-[180px] bg-white rounded-xl shadow-dropdown border border-border p-1 animate-in fade-in zoom-in-95"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <DropdownMenu.Item
                        key={option.value}
                        onSelect={() => handleFilterChange("sortBy", option.value)}
                        className={`
                          flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer outline-none transition-colors
                          ${filters.sortBy === option.value ? "bg-primary/10 text-primary font-bold" : "text-text-primary hover:bg-bg-secondary"}
                        `}
                      >
                        {option.icon}
                        {option.label}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </Tabs.Root>
        </div>

        {/* Posts List */}
        <div className="flex flex-col gap-4 mt-2">
          {loading && page === 1 ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="lg" text="Discovering knowledge..." />
            </div>
          ) : error ? (
            <ErrorMessage
              message={error}
              onRetry={() => fetchPosts(1, false)}
            />
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-border text-center py-16 px-4">
              <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <FiFilter className="w-8 h-8 text-text-tertiary" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-1">No posts found</h3>
              <p className="text-text-secondary mb-6 max-w-sm mx-auto">
                We couldn't find any posts matching your current filters. Try adjusting them or start a new topic!
              </p>
              <Button onClick={() => navigate("/create-post")} variant="primary">
                Create First Post
              </Button>
            </div>
          ) : (
            <>
              {posts.map((post, index) => (
                <PostCard
                  key={post._id}
                  post={post}
                  position={index + 1} 
                  source="feed" 
                />
              ))}

              {/* Infinite Scroll Sentinel */}
              {hasMore && (
                <div ref={lastPostElementRef} className="py-8 flex justify-center">
                  {loading && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Loading more</span>
                    </div>
                  )}
                </div>
              )}

              {/* End of Feed */}
              {!hasMore && posts.length > 0 && (
                <div className="py-10 text-center">
                  <div className="inline-block px-4 py-2 bg-bg-secondary rounded-full text-sm font-semibold text-text-secondary">
                    You've reached the end of your feed
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
