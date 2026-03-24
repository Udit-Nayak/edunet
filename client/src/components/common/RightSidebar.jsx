import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { SubjectBadge } from '../ui/Tag';
import { Avatar } from '../ui/Avatar';

export default function RightSidebar({ aiPicks = [], trendingDiscussions = [], topUsers = [] }) {
  return (
    <aside className="w-80 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto py-4 px-3 flex-col gap-4 hidden xl:flex custom-scrollbar">
      
      {/* AI Picks Widget */}
      <Card className="flex flex-col gap-3 object-cover">
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1 flex items-center gap-1">
          <span className="text-[14px]">✨</span> AI Recommended For You
        </h3>
        {aiPicks.length > 0 ? (
          <div className="flex flex-col gap-3">
            {aiPicks.map((post, idx) => (
              <Link
                key={idx}
                to={post.id ? `/post/${post.id}` : '/feed'}
                className="flex flex-col gap-1.5 cursor-pointer hover:bg-surface-hover p-1.5 -mx-1.5 rounded-md transition-colors border-none outline-none"
              >
                <span className="text-sm font-semibold text-text-primary line-clamp-2 hover:text-primary transition-colors">{post.title}</span>
                <div className="flex items-center gap-2">
                  <SubjectBadge subjectColor={post.subjectColor || '#0A66C2'}>{post.subject}</SubjectBadge>
                  <span className="text-xs text-text-tertiary">{post.timeAgo}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Explore more to get personalized AI picks.</p>
        )}
      </Card>

      {/* Trending Discussions Widget */}
      <Card className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">
          🔥 Trending Discussions
        </h3>
        {trendingDiscussions.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {trendingDiscussions.map((topic, idx) => (
              <li key={idx}>
                <Link to={topic.id ? `/post/${topic.id}` : '/feed'} className="flex items-start gap-2 group cursor-pointer border-none outline-none">
                <span className="text-sm font-semibold text-text-tertiary w-4 shrink-0 text-right">{idx + 1}.</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors line-clamp-2">{topic.title}</span>
                  <span className="text-xs text-text-tertiary mt-0.5">{topic.commentCount} comments</span>
                </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-text-secondary">No current trends.</p>
        )}
      </Card>

      {/* Leaderboard Widget */}
      <Card className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">
          🏆 Top This Week
        </h3>
        {topUsers.length > 0 ? (
          <div className="flex flex-col gap-3">
            {topUsers.map((u, idx) => (
              <Link key={idx} to={u.id ? `/user/${u.id}` : '/feed'} className="flex items-center gap-3">
                <span className="text-sm font-bold text-text-tertiary w-3 text-right">{idx + 1}</span>
                <Avatar src={u.avatar} size="sm" showRing={u.reputation > 500} />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-semibold text-text-primary truncate">{u.name}</span>
                </div>
                <span className="text-xs font-bold text-black px-1.5 py-0.5 bg-accent-green bg-opacity-10 rounded-md">+{u.repDelta} rep</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Be the first to contribute!</p>
        )}
      </Card>

    </aside>
  );
}
