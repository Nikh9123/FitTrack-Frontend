import type { ShareCoachReportData } from "@/components/coach/ShareableCoachCard";
import type { MonthlyReport, WeeklyReview } from "@/lib/coach-api";
import * as Sharing from "expo-sharing";
import { useCallback, useRef, useState } from "react";
import { Alert, Share, View } from "react-native";
import { captureRef } from "react-native-view-shot";

export function weeklyToShareData(review: WeeklyReview): ShareCoachReportData {
  return {
    kind: "weekly",
    title: "Weekly Review",
    periodLabel: review.weekLabel,
    score: review.overallScore,
    headline: review.aiSummary,
    stats: [
      { label: "Steps", value: review.summary.steps.toLocaleString() },
      { label: "Workouts", value: review.summary.workouts },
      { label: "Active days", value: `${review.activeDaysCount ?? 0}/7` },
      {
        label: "Weight",
        value:
          review.summary.weight.change === 0
            ? "No change"
            : `${review.summary.weight.change > 0 ? "+" : ""}${review.summary.weight.change} kg`,
      },
    ],
  };
}

export function monthlyToShareData(report: MonthlyReport): ShareCoachReportData {
  const weightChange =
    report.summary.weightChange === 0
      ? "No change"
      : `${report.summary.weightChange > 0 ? "+" : ""}${report.summary.weightChange} kg`;
  return {
    kind: "monthly",
    title: "Monthly Report",
    periodLabel: report.monthLabel,
    score: report.overallScore,
    headline: report.aiSummary,
    stats: [
      { label: "Workouts", value: String(report.summary.totalWorkouts) },
      { label: "Steps", value: report.summary.totalSteps.toLocaleString() },
      { label: "Weight", value: weightChange },
      {
        label: "Volume",
        value:
          report.summary.totalVolumeKg != null
            ? `${Math.round(report.summary.totalVolumeKg).toLocaleString()} kg`
            : "—",
      },
    ],
  };
}

export function useShareCoachReport() {
  const cardRef = useRef<View>(null);
  const [shareData, setShareData] = useState<ShareCoachReportData | null>(null);
  const [sharing, setSharing] = useState(false);

  const share = useCallback(async (data: ShareCoachReportData) => {
    setSharing(true);
    setShareData(data);
    await new Promise((r) => setTimeout(r, 120));

    try {
      if (cardRef.current) {
        const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Share your coach report",
          });
          return;
        }
      }
      await Share.share({
        message: `${data.title} · ${data.periodLabel}\nScore ${data.score}/100\n\n${data.headline}\n\n— FitTrack Coach`,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not share report";
      Alert.alert("Share failed", message);
    } finally {
      setSharing(false);
    }
  }, []);

  return { cardRef, shareData, sharing, share };
}
