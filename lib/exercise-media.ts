const DEFAULT_EXERCISE_YOUTUBE: Record<string, string> = {
  "barbell bench press": "https://www.youtube.com/watch?v=rT7DgCr-3ps",
  squats: "https://www.youtube.com/watch?v=MVMnk0HuH0k",
  deadlift: "https://www.youtube.com/watch?v=ytGaGIn3SjY",
  "dumbbell bicep curl": "https://www.youtube.com/watch?v=cBSD6mQIPQk",
};

export function getExerciseVideoUrl(exercise: {
  videoUrl?: string | null;
  tutorialVideoUrl?: string | null;
  tutorialUrl?: string | null;
}): string | null {
  const url =
    exercise?.videoUrl ?? exercise?.tutorialVideoUrl ?? exercise?.tutorialUrl;
  return typeof url === "string" && /\.mp4($|\?)/i.test(url) ? url : null;
}

export function getYoutubeEmbedUrl(exercise: {
  name?: string;
  youtubeUrl?: string | null;
  tutorialYoutubeUrl?: string | null;
  youtubeId?: string | null;
}): string | null {
  const raw =
    exercise?.youtubeUrl ??
    exercise?.tutorialYoutubeUrl ??
    exercise?.youtubeId ??
    DEFAULT_EXERCISE_YOUTUBE[String(exercise?.name ?? "").trim().toLowerCase()];
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = raw.trim();
  const idMatch =
    value.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ??
    value.match(/[?&]v=([A-Za-z0-9_-]{6,})/) ??
    value.match(/embed\/([A-Za-z0-9_-]{6,})/) ??
    value.match(/^([A-Za-z0-9_-]{6,})$/);
  const videoId = idMatch?.[1];
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&controls=1&playsinline=1`;
}
