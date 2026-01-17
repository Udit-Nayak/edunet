import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  posts: [],
  currentPost: null,
  loading: false,
  error: null,
  hasMore: true,
  page: 1,
};

const postSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setPosts: (state, action) => {
      state.posts = action.payload;
      state.loading = false;
      state.error = null;
    },
    appendPosts: (state, action) => {
      state.posts = [...state.posts, ...action.payload];
      state.loading = false;
    },
    setCurrentPost: (state, action) => {
      state.currentPost = action.payload;
      state.loading = false;
    },
    updatePostInList: (state, action) => {
      const index = state.posts.findIndex(p => p._id === action.payload._id);
      if (index !== -1) {
        state.posts[index] = { ...state.posts[index], ...action.payload };
      }
      if (state.currentPost?._id === action.payload._id) {
        state.currentPost = { ...state.currentPost, ...action.payload };
      }
    },
    removePostFromList: (state, action) => {
      state.posts = state.posts.filter(p => p._id !== action.payload);
      if (state.currentPost?._id === action.payload) {
        state.currentPost = null;
      }
    },
    setHasMore: (state, action) => {
      state.hasMore = action.payload;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    },
    clearPosts: (state) => {
      state.posts = [];
      state.currentPost = null;
      state.page = 1;
      state.hasMore = true;
    },
  },
});

export const {
  setLoading,
  setError,
  setPosts,
  appendPosts,
  setCurrentPost,
  updatePostInList,
  removePostFromList,
  setHasMore,
  setPage,
  clearPosts,
} = postSlice.actions;

export default postSlice.reducer;