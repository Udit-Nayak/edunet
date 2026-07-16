import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { Card } from '../ui/Card';
import { SubjectBadge } from '../ui/Tag';
import { Avatar } from '../ui/Avatar';

export default function RightSidebar({ aiPicks = [], trendingDiscussions = [], topUsers = [] }) {
  return (
    <aside className="custom-scrollbar sticky top-14 hidden h-[calc(100vh-56px)] w-80 flex-col gap-4 overflow-y-auto px-3 py-4 xl:flex">
      <Card className="flex flex-col gap-3">
        <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Recommended For You
        </h3>
        {aiPicks.length > 0 ? (
          <div className="flex flex-col gap-3">
            {aiPicks.map((post, idx) => (
              <Link
                key={idx}
                to={post.id ? `/post/${post.id}` : '/feed'}
                className="-mx-1.5 flex cursor-pointer flex-col gap-1.5 rounded-md border-none p-1.5 outline-none transition-colors hover:bg-surface-hover"
              >
                <span className="line-clamp-2 text-sm font-semibold text-text-primary transition-colors hover:text-primary">{post.title}</span>
                <div className="flex items-center gap-2">
                  <SubjectBadge subjectColor={post.subjectColor || '#0A66C2'}>{post.subject}</SubjectBadge>
                  <span className="text-xs text-text-tertiary">{post.timeAgo}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-5 text-text-secondary">Explore more posts to get personalized recommendations.</p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          <TrendingUp className="h-4 w-4 text-accent-orange" />
          Trending Discussions
        </h3>
        {trendingDiscussions.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {trendingDiscussions.map((topic, idx) => (
              <li key={idx}>
                <Link to={topic.id ? `/post/${topic.id}` : '/feed'} className="group flex cursor-pointer items-start gap-2 border-none outline-none">
                  <span className="w-4 shrink-0 text-right text-sm font-semibold text-text-tertiary">{idx + 1}.</span>
                  <div className="flex flex-col">
                    <span className="line-clamp-2 text-sm font-medium text-text-primary transition-colors group-hover:text-primary">{topic.title}</span>
                    <span className="mt-0.5 text-xs text-text-tertiary">{topic.commentCount} comments</span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-text-secondary">No current trends.</p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          <Trophy className="h-4 w-4 text-accent-green" />
          Top This Week
        </h3>
        {topUsers.length > 0 ? (
          <div className="flex flex-col gap-3">
            {topUsers.map((u, idx) => (
              <Link key={idx} to={u.id ? `/user/${u.id}` : '/feed'} className="flex items-center gap-3 rounded-md transition-colors hover:bg-surface-hover">
                <span className="w-3 text-right text-sm font-bold text-text-tertiary">{idx + 1}</span>
                <Avatar src={u.avatar} size="sm" showRing={u.reputation > 500} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-text-primary">{u.name}</span>
                </div>
                <span className="rounded-md bg-accent-green/10 px-1.5 py-0.5 text-xs font-bold text-text-primary">+{u.repDelta} rep</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Be the first to contribute.</p>
        )}
      </Card>
    </aside>
  );
}
