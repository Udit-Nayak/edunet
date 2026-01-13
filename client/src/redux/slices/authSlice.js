import { createSlice } from "@reduxjs/toolkit";
const initialState = {
  user: null,
  token: localStorage.getItem("token") || null,
  isAuthenticated: false,
  loading: false,
  needsProfileSetup: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.needsProfileSetup = action.payload.needsProfileSetup || false;
      localStorage.setItem("token", action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.needsProfileSetup = false;
      localStorage.removeItem("token");
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    setNeedsProfileSetup: (state, action) => {
      state.needsProfileSetup = action.payload;
    },
  },
});

export const {
  setLoading,
  loginSuccess,
  logout,
  updateUser,
  setNeedsProfileSetup,
} = authSlice.actions;
export default authSlice.reducer;
