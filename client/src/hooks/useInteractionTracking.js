import { useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { learningAPI } from '../services/api';
import { useAuth } from './useAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Hook to track user interactions with posts
 * 
 * Usage:
 * const { trackView, trackClick, trackScroll } = useInteractionTracking();
 */
export const useInteractionTracking = () => {
  const sessionId = useRef(generateSessionId());

  /**
   * Track post view
   */
  const trackView = useCallback(async (postId, source = 'feed', position = 0) => {
    if (!postId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post(
        `${API_BASE}/analytics/track-interaction`,
        {
          postId,
          action: 'view',
          metadata: {
            source,
            clickPosition: position,
            sessionId: sessionId.current,
            deviceType: getDeviceType()
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
    } catch {
      // Silently fail - analytics shouldn't break the UI
    }
  }, []);

  /**
   * Track post click
   */
  const trackClick = useCallback(async (postId, source = 'feed', position = 0) => {
    if (!postId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post(
        `${API_BASE}/analytics/track-interaction`,
        {
          postId,
          action: 'click',
          metadata: {
            source,
            clickPosition: position,
            sessionId: sessionId.current,
            deviceType: getDeviceType()
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
    } catch {
      // Silently fail - analytics shouldn't break the UI
    }
  }, []);

  /**
   * Track detailed view with time and scroll
   */
  const trackDetailedView = useCallback(async (postId, timeSpent, scrollDepth, source = 'detail') => {
    if (!postId || timeSpent < 1) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post(
        `${API_BASE}/analytics/track-interaction`,
        {
          postId,
          action: 'view',
          metadata: {
            timeSpent: Math.round(timeSpent),
            scrollDepth: Math.round(scrollDepth),
            source,
            sessionId: sessionId.current,
            deviceType: getDeviceType()
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
    } catch {
      // Silently fail - analytics shouldn't break the UI
    }
  }, []);

  /**
   * Track tag click
   */
  const trackTagClick = useCallback(async (postId, tag) => {
    if (!postId || !tag) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post(
        `${API_BASE}/analytics/track-interaction`,
        {
          postId,
          action: 'tag_click',
          metadata: {
            tag,
            sessionId: sessionId.current,
            deviceType: getDeviceType()
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
    } catch {
      // Silently fail - analytics shouldn't break the UI
    }
  }, []);

  return {
    trackView,
    trackClick,
    trackDetailedView,
    trackTagClick
  };
};

/**
 * Hook to track time spent on a page
 */
export const useTimeTracking = (postId, source = 'detail') => {
  const startTime = useRef(null);
  const { trackDetailedView } = useInteractionTracking();

  useEffect(() => {
    // Initialize start time on mount
    if (!startTime.current) {
      startTime.current = Date.now();
    }
    
    let scrollDepth = 0;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      const currentDepth = ((scrollTop + windowHeight) / documentHeight) * 100;
      scrollDepth = Math.max(scrollDepth, currentDepth);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);

      // Track when component unmounts
      const timeSpent = (Date.now() - startTime.current) / 1000; // Convert to seconds
      
      if (timeSpent > 1) { // Only track if spent more than 1 second
        trackDetailedView(postId, timeSpent, scrollDepth, source);
      }
    };
  }, [postId, source, trackDetailedView]);
};

/**
 * Hook to track viewport visibility
 */
export const useViewportTracking = (ref, postId, onView) => {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!ref.current || hasTracked.current) return;

    const element = ref.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked.current) {
            hasTracked.current = true;
            if (onView) {
              onView(postId);
            }
          }
        });
      },
      {
        threshold: 0.5 // Trigger when 50% visible
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, postId, onView]);
};

// ============= Helper Functions =============

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// ============= PHASE 9: Continuous Learning Interaction Tracking =============

/**
 * Phase 9: Advanced interaction tracking for continuous learning
 * Tracks detailed user behavior for model retraining and A/B testing
 * 
 * Event Types:
 * - impression: Post shown to user
 * - click: User clicked on post
 * - read: User spent significant time (>30s) reading
 * - quick_exit: User left within 5 seconds
 * - upvote, downvote: Voting actions
 * - save, unsave: Save actions
 * - share: Sharing action
 * - comment, answer: Engagement actions
 */
export const useLearningTracking = (postId, context = {}) => {
  const { user } = useAuth();
  const startTimeRef = useRef(null);
  const scrollDepthRef = useRef(0);
  const sessionIdRef = useRef(null);
  const hasRecordedImpressionRef = useRef(false);
  const interactionQueueRef = useRef([]);

  // Generate session ID once per page load
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
    }
  }, []);

  /**
   * Record an interaction event
   */
  const recordInteraction = useCallback(async (eventType, additionalData = {}) => {
    if (!user || !postId) return;

    try {
      const interactionData = {
        postId,
        eventType,
        readTime: startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0,
        scrollDepth: scrollDepthRef.current,
        context: {
          source: context.source || 'direct',
          position: context.position,
          page: typeof context.page === 'number' ? context.page : undefined,  // Only send if it's a number
          sortBy: context.sortBy,
          filterType: context.filterType,
          device: getDeviceType(),
          ...additionalData.context
        },
        sessionId: sessionIdRef.current,
        ...additionalData
      };

      await learningAPI.recordInteraction(interactionData);
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.debug('Failed to record interaction:', error);
    }
  }, [user, postId, context]);

  /**
   * Queue interaction for batch sending (optional optimization)
   */
  const queueInteraction = useCallback((eventType, additionalData = {}) => {
    if (!user || !postId) return;

    interactionQueueRef.current.push({
      postId,
      eventType,
      readTime: startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0,
      scrollDepth: scrollDepthRef.current,
      context: {
        source: context.source || 'direct',
        position: context.position,
        page: typeof context.page === 'number' ? context.page : undefined,  // Only send if it's a number
        sortBy: context.sortBy,
        filterType: context.filterType,
        device: getDeviceType(),
        ...additionalData.context
      },
      sessionId: sessionIdRef.current,
      ...additionalData
    });
  }, [user, postId, context]);

  /**
   * Flush interaction queue (send batch)
   */
  const flushQueue = useCallback(async () => {
    if (interactionQueueRef.current.length === 0) return;

    try {
      const interactions = [...interactionQueueRef.current];
      interactionQueueRef.current = [];
      
      await learningAPI.recordBatchInteractions(interactions);
    } catch (error) {
      console.debug('Failed to flush interaction queue:', error);
    }
  }, []);

  /**
   * Track impression (post shown to user)
   */
  useEffect(() => {
    if (!user || !postId || hasRecordedImpressionRef.current) return;

    // Record impression after a short delay (user actually saw it)
    const timer = setTimeout(() => {
      recordInteraction('impression');
      hasRecordedImpressionRef.current = true;
    }, 500);

    return () => clearTimeout(timer);
  }, [user, postId, recordInteraction]);

  /**
   * Track click (when component mounts, user likely clicked to view)
   */
  useEffect(() => {
    if (!user || !postId || !context.trackClickOnMount) return;

    startTimeRef.current = Date.now();

    // Record click event
    recordInteraction('click');

    return () => {
      // On unmount, check read time
      if (startTimeRef.current) {
        const readTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        if (readTime < 5) {
          // Quick exit
          recordInteraction('quick_exit', { readTime });
        } else if (readTime >= 30) {
          // Significant read
          recordInteraction('read', { readTime });
        }
      }
    };
  }, [user, postId, recordInteraction, context.trackClickOnMount]);

  /**
   * Track scroll depth
   */
  useEffect(() => {
    if (!user || !postId) return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      const scrollPercentage = Math.min(
        100,
        Math.round(((scrollTop + windowHeight) / documentHeight) * 100)
      );

      scrollDepthRef.current = Math.max(scrollDepthRef.current, scrollPercentage);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user, postId]);

  /**
   * Flush queue before page unload
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushQueue();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushQueue]);

  /**
   * Periodic queue flush (every 30 seconds)
   */
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      flushQueue();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, flushQueue]);

  // Return tracking functions for manual tracking
  return {
    recordInteraction,
    queueInteraction,
    flushQueue,
    trackUpvote: () => recordInteraction('upvote'),
    trackDownvote: () => recordInteraction('downvote'),
    trackSave: () => recordInteraction('save'),
    trackUnsave: () => recordInteraction('unsave'),
    trackShare: () => recordInteraction('share'),
    trackComment: () => recordInteraction('comment'),
    trackAnswer: () => recordInteraction('answer'),
    trackClick: () => recordInteraction('click')
  };
};

/**
 * Simple interaction tracking for list items (feed, search results)
 * Automatically tracks impressions when posts are visible
 */
export const useListItemTracking = (postId, position, context = {}) => {
  const { user } = useAuth();
  const hasRecordedRef = useRef(false);

  useEffect(() => {
    if (!user || !postId || hasRecordedRef.current) return;

    // Record impression after short visibility
    const timer = setTimeout(() => {
      learningAPI.recordInteraction({
        postId,
        eventType: 'impression',
        context: {
          source: context.source || 'feed',
          position,
          page: typeof context.page === 'number' ? context.page : undefined,  // Only send if it's a number
          sortBy: context.sortBy,
          filterType: context.filterType,
          device: getDeviceType()
        }
      }).catch(err => console.debug('Failed to record impression:', err));
      
      hasRecordedRef.current = true;
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, postId, position, context]);
};