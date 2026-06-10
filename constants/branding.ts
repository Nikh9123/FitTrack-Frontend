/** Central app branding — import instead of hardcoding "Veera" / storage keys. */
export const APP_NAME = "Veera";
export const APP_TAGLINE = "Your personal AI fitness coach";
export const APP_SCHEME = "veera";

export const STORAGE_KEYS = {
  theme: "@veera_theme_mode",
  token: "@veera_token",
  user: "@veera_user",
  inbodyReports: "@veera_inbody_reports",
  connectedDevices: "@veera_connected_devices",
  stepBannerDismissed: "@veera_step_banner_dismissed",
  activitySyncQueue: "@veera_activity_sync_queue",
  workoutHistory: "@veera_workout_history",
  personalRecords: "@veera_personal_records",
  activeSession: "@veera_active_session",
  dailyActivity: "@veera_daily_activity",
  reminderPrefs: "@veera_reminder_prefs",
  stepGoal: "@veera_step_goal",
  profileAvatarLocal: "@veera_profile_avatar_local",
} as const;

/** Previous FitTrack AsyncStorage keys — read once when migrating local data. */
export const LEGACY_STORAGE_KEYS: Record<keyof typeof STORAGE_KEYS, string> = {
  theme: "@fittrack_theme_mode",
  token: "@fittrack_token",
  user: "@fittrack_user",
  inbodyReports: "@fittrack_inbody_reports",
  connectedDevices: "@fittrack_connected_devices",
  stepBannerDismissed: "@fittrack_step_banner_dismissed",
  activitySyncQueue: "@fittrack_activity_sync_queue",
  workoutHistory: "@fittrack_workout_history",
  personalRecords: "@fittrack_personal_records",
  activeSession: "@fittrack_active_session",
  dailyActivity: "@fittrack_daily_activity",
  reminderPrefs: "@fittrack_reminder_prefs",
  stepGoal: "@fittrack_step_goal",
  profileAvatarLocal: "@fittrack_profile_avatar_local",
};

export const BACKGROUND_STEP_SYNC_TASK = "veera-background-step-sync";
