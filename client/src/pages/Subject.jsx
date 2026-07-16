import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { postAPI } from "../services/api";
import PageShell from "../components/common/PageShell";
import PostCard from "../components/post/PostCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { FiBook, FiClock, FiStar, FiTrendingUp } from "react-icons/fi";
import { Button } from "../components/ui/Button";

// Map subject slugs to display names and colors
const SUBJECT_MAP = {
  "computer-science": { label: "Computer Science", color: "#0DD3BB", bg: "bg-[#0DD3BB]/10", text: "text-[#0DD3BB]" },
  "mathematics": { label: "Mathematics", color: "#0A66C2", bg: "bg-[#0A66C2]/10", text: "text-[#0A66C2]" },
  "physics": { label: "Physics", color: "#FF4500", bg: "bg-[#FF4500]/10", text: "text-[#FF4500]" },
  "biology": { label: "Biology", color: "#27C93F", bg: "bg-[#27C93F]/10", text: "text-[#27C93F]" },
  "chemistry": { label: "Chemistry", color: "#FFBD2E", bg: "bg-[#FFBD2E]/10", text: "text-[#FFBD2E]" },
};

export default function Subject() {
  const { subject } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState("recent");
  
  const observer = useRef();
  const lastPostElementRef = useRef();

  const formattedSubject = subject.replace("-", " ");
  const subjectMetadata = SUBJECT_MAP[subject] || { label: formattedSubject, color: "#1D1D1D", bg: "bg-bg-secondary", text: "text-text-primary" };

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, sortBy]);

  const fetchPosts = useCallback(async (pageNum, append = false) => {
    try {
      setLoading(true);
      const params = {
        page: pageNum,
        limit: 10,
        sortBy,
        subject: subjectMetadata.label, // Send the formatted label to backend if supported
      };

      const response = await postAPI.getPosts(params);
      const newPosts = response.data.posts || [];

      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(
        response.data.pagination 
        ? response.data.pagination.currentPage < response.data.pagination.totalPages
        : false
      );
      setPage(pageNum);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load posts for this subject");
    } finally {
      setLoading(false);
    }
  }, [subjectMetadata.label, sortBy]);

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

  return (
    <PageShell>
      <div className="flex flex-col gap-4 pb-12">
        {/* Subject Header */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-white p-5 shadow-card md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${subjectMetadata.bg} ${subjectMetadata.text}`}>
              <FiBook className="h-7 w-7" />
            </div>
            <div>
              <h1 className="mb-1 text-2xl font-bold capitalize text-text-primary">{subjectMetadata.label}</h1>
              <p className="text-sm text-text-secondary">
                Explore notes, questions, and articles across {subjectMetadata.label}
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={() => navigate('/create-post')} className="w-full md:w-auto">
            Post in {subjectMetadata.label}
          </Button>
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-border bg-white p-2 shadow-card">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <FilterButton active={sortBy === 'recent'} onClick={() => setSortBy('recent')} icon={<FiClock />} label="Recent" />
            <FilterButton active={sortBy === 'popular'} onClick={() => setSortBy('popular')} icon={<FiStar />} label="Popular" />
            <FilterButton active={sortBy === 'trending'} onClick={() => setSortBy('trending')} icon={<FiTrendingUp />} label="Trending" />
          </div>
        </div>

        {/* Posts List */}
        <div className="flex flex-col gap-4 mt-2">
          {loading && page === 1 ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="lg" text={`Loading ${subjectMetadata.label} posts...`} />
            </div>
          ) : error ? (
            <ErrorMessage message={error} onRetry={() => fetchPosts(1, false)} />
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-border bg-white px-4 py-16 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
                <FiBook className="h-8 w-8 text-text-tertiary" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-1">No posts found</h3>
              <p className="text-text-secondary mb-6 max-w-sm mx-auto">
                Be the first to share knowledge about {subjectMetadata.label}!
              </p>
              <Button onClick={() => navigate("/create-post")} variant="primary">
                Create First Post
              </Button>
            </div>
          ) : (
            <>
              {posts.map((post, index) => (
                <PostCard key={post._id} post={post} position={index + 1} source="subject" />
              ))}

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

              {!hasMore && posts.length > 0 && (
                <div className="py-10 text-center">
                  <div className="inline-block px-4 py-2 bg-bg-secondary rounded-full text-sm font-semibold text-text-secondary">
                    You've reached the end of the {subjectMetadata.label} feed
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

function FilterButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0
        ${active ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"}
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
