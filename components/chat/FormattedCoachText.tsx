import { useColors } from "@/hooks/useColors";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface FormattedCoachTextProps {
  content: string;
  color: string;
  boldColor?: string;
}

type Block =
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "heading"; text: string };

function stripMarkdownInline(text: string): { text: string; bold?: boolean }[] {
  const parts: { text: string; bold?: boolean }[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      blocks.push({ type: "bullet", text: bullet[1].replace(/^\*\*|\*\*$/g, "") });
      continue;
    }

    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      blocks.push({ type: "bullet", text: numbered[1] });
      continue;
    }

    if (line.endsWith(":") && line.length < 60 && !line.includes(".")) {
      blocks.push({ type: "heading", text: line.replace(/\*\*/g, "") });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  return blocks;
}

function InlineText({ text, color, boldColor }: { text: string; color: string; boldColor: string }) {
  const parts = stripMarkdownInline(text.replace(/^\*\*|\*\*$/g, ""));
  return (
    <Text style={[styles.body, { color }]}>
      {parts.map((p, i) => (
        <Text key={i} style={p.bold ? [styles.bold, { color: boldColor }] : undefined}>
          {p.text}
        </Text>
      ))}
    </Text>
  );
}

export function FormattedCoachText({ content, color, boldColor }: FormattedCoachTextProps) {
  const colors = useColors();
  const accent = boldColor ?? colors.foreground;
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <View style={styles.wrap}>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <Text key={i} style={[styles.heading, { color: accent }]}>
              {block.text}
            </Text>
          );
        }
        if (block.type === "bullet") {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
              <View style={styles.bulletText}>
                <InlineText text={block.text} color={color} boldColor={accent} />
              </View>
            </View>
          );
        }
        return (
          <View key={i} style={styles.paragraph}>
            <InlineText text={block.text} color={color} boldColor={accent} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  paragraph: {},
  body: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  bold: { fontFamily: "Inter_600SemiBold" },
  heading: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20, marginTop: 2 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingLeft: 2 },
  bulletDot: { fontSize: 16, lineHeight: 21, fontFamily: "Inter_700Bold" },
  bulletText: { flex: 1 },
});
