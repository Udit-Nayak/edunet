import { useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

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
      if (!token) {
        console.log('No auth token, skipping view tracking');
        return;
      }

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
      console.log(`✅ Tracked view for post ${postId}`);
    } catch (error) {
      console.error('Error tracking view:', error.response?.data || error.message);
    }
  }, []);

  /**
   * Track post click
   */
  const trackClick = useCallback(async (postId, source = 'feed', position = 0) => {
    if (!postId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No auth token, skipping click tracking');
        return;
      }

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
      console.log(`✅ Tracked click for post ${postId}`);
    } catch (error) {
      console.error('Error tracking click:', error.response?.data || error.message);
    }
  }, []);

  /**
   * Track detailed view with time and scroll
   */
  const trackDetailedView = useCallback(async (postId, timeSpent, scrollDepth, source = 'detail') => {
    if (!postId || timeSpent < 1) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No auth token, skipping detailed view tracking');
        return;
      }

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
      console.log(`✅ Tracked detailed view for post ${postId} (${Math.round(timeSpent)}s, ${Math.round(scrollDepth)}%)`);
    } catch (error) {
      console.error('Error tracking detailed view:', error.response?.data || error.message);
    }
  }, []);

  /**
   * Track tag click
   */
  const trackTagClick = useCallback(async (postId, tag) => {
    if (!postId || !tag) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No auth token, skipping tag click tracking');
        return;
      }

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
      console.log(`✅ Tracked tag click: ${tag} on post ${postId}`);
    } catch (error) {
      console.error('Error tracking tag click:', error.response?.data || error.message);
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
  const startTime = useRef(Date.now());
  const { trackDetailedView } = useInteractionTracking();

  useEffect(() => {
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

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
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