"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  User2, 
  Lock, 
  Save, 
  Loader2,
  Mail,
  Shield,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    email: "",
    name: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadProfile();
  }, [router]);

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          email: data.user.email,
          name: data.user.name || "",
        });
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: profile.name }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Profile updated successfully!");
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Password changed successfully!");
        setPasswords({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/chat")}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your account</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Info Card */}
        <section className="bg-card rounded-2xl p-6 border border-border shadow-sm animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/20">
              <User2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Profile Information</h2>
              <p className="text-sm text-muted-foreground">Update your personal details</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border 
                           text-foreground/60 text-sm cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Display Name</label>
              <div className="relative">
                <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Enter your name"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border 
                           text-foreground text-sm placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm
                       hover:opacity-90 transition-all duration-200 disabled:opacity-50
                       flex items-center justify-center gap-2 shadow-lg shadow-primary/20
                       active:scale-[0.98]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </form>
        </section>

        {/* Change Password Card */}
        <section className="bg-card rounded-2xl p-6 border border-border shadow-sm animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Change Password</h2>
              <p className="text-sm text-muted-foreground">Update your security credentials</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border 
                           text-foreground text-sm placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border 
                           text-foreground text-sm placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all duration-200"
                />
              </div>
              {passwords.newPassword.length > 0 && (
                <div className={`flex items-center gap-2 text-xs ${passwords.newPassword.length >= 6 ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <CheckCircle className={`w-3.5 h-3.5 ${passwords.newPassword.length >= 6 ? 'opacity-100' : 'opacity-30'}`} />
                  <span>At least 6 characters</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border 
                           text-foreground text-sm placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all duration-200"
                />
              </div>
              {passwords.confirmPassword.length > 0 && (
                <div className={`flex items-center gap-2 text-xs ${passwords.newPassword === passwords.confirmPassword ? 'text-green-500' : 'text-destructive'}`}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{passwords.newPassword === passwords.confirmPassword ? 'Passwords match' : 'Passwords don\'t match'}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !passwords.currentPassword || !passwords.newPassword}
              className="w-full py-3 rounded-xl bg-violet-600 text-white font-medium text-sm
                       hover:bg-violet-700 transition-all duration-200 disabled:opacity-50
                       flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20
                       active:scale-[0.98]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Update Password
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
