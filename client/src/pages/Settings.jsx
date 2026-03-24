import { useState, useEffect } from "react";
import PageShell from "../components/common/PageShell";
import { FiMoon, FiSun, FiSettings, FiBell, FiLock } from "react-icons/fi";
import toast from "react-hot-toast";
import { authAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function Settings() {
  const { isAuthenticated } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showPasswordCard, setShowPasswordCard] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handlePasswordInputChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error("Please log in to update your password");
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill all password fields");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordCard(false);
      toast.success("Password updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <PageShell showRightSidebar={false}>
      <div className="max-w-4xl mx-auto pb-12">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <FiSettings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
            <p className="text-[15px] font-medium text-text-secondary">
              Manage your account preferences and app settings
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Appearance Section */}
          <div className="bg-bg-secondary rounded-2xl shadow-card border border-border p-6 sm:p-8">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 bg-surface-hover rounded-xl flex items-center justify-center text-text-primary">
                {isDarkMode ? <FiMoon className="w-5 h-5" /> : <FiSun className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Appearance</h2>
                <p className="text-[14px] text-text-secondary">Customize how the application looks</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[15px] text-text-primary mb-1">Theme</p>
                <p className="text-[14px] text-text-secondary">Toggle between light and dark mode</p>
              </div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-primary ${
                  isDarkMode ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span className="sr-only">Toggle Dark Mode</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    isDarkMode ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-bg-secondary rounded-2xl shadow-card border border-border p-6 sm:p-8 opacity-80 pointer-events-none">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 bg-surface-hover rounded-xl flex items-center justify-center text-text-primary">
                <FiBell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Notifications <span className="text-[12px] ml-2 px-2 py-0.5 bg-bg-primary border border-border rounded-md text-text-tertiary uppercase tracking-wider">Coming Soon</span></h2>
                <p className="text-[14px] text-text-secondary">Control how we stay in touch</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[15px] text-text-primary mb-1">Email Notifications</p>
                <p className="text-[14px] text-text-secondary">Receive summary emails and important updates</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-primary ${
                  emailNotifications ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span className="sr-only">Toggle Email Notifications</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    emailNotifications ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          
          
          {/* Account Security Section */}
          <div className="bg-bg-secondary rounded-2xl shadow-card border border-border p-6 sm:p-8">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 bg-surface-hover rounded-xl flex items-center justify-center text-accent-red">
                <FiLock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Security</h2>
                <p className="text-[14px] text-text-secondary">Account security parameters</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-[15px] text-text-primary mb-1">Change Password</p>
                <p className="text-[14px] text-text-secondary">Update your password to stay secure</p>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordCard((prev) => !prev)}
                className="px-5 py-2.5 border border-border bg-bg-primary hover:bg-surface-hover text-text-primary font-bold text-[14px] rounded-xl transition-all shadow-sm"
              >
                {showPasswordCard ? "Hide" : "Update Password"}
              </button>
            </div>

            {showPasswordCard && (
              <form onSubmit={handleUpdatePassword} className="space-y-4 mt-6 pt-6 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2 sm:col-span-2">
                    <span className="text-[13px] font-semibold text-text-secondary">Current Password</span>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-[13px] font-semibold text-text-secondary">New Password</span>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-[13px] font-semibold text-text-secondary">Confirm New Password</span>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                {!isAuthenticated && (
                  <p className="text-[13px] font-medium text-accent-red">
                    You need to be logged in to change your password.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isUpdatingPassword || !isAuthenticated}
                  className="px-5 py-2.5 border border-border bg-bg-primary hover:bg-surface-hover disabled:opacity-60 disabled:cursor-not-allowed text-text-primary font-bold text-[14px] rounded-xl transition-all shadow-sm"
                >
                  {isUpdatingPassword ? "Updating..." : "Confirm Password Change"}
                </button>
              </form>
            )}
          </div>
          
        </div>
      </div>
    </PageShell>
  );
}
