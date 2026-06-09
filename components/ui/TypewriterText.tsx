import { useReducedMotion } from "@/hooks/useReducedMotion";
import React, { useEffect, useState } from "react";
import { Text, TextStyle } from "react-native";

interface TypewriterTextProps {
  text: string;
  style?: TextStyle;
  speedMs?: number;
  numberOfLines?: number;
}

export function TypewriterText({ text, style, speedMs = 18, numberOfLines }: TypewriterTextProps) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(reduceMotion ? text.length : 0);

  useEffect(() => {
    if (reduceMotion) {
      setVisible(text.length);
      return;
    }
    setVisible(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setVisible(i);
      if (i >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs, reduceMotion]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {text.slice(0, visible)}
    </Text>
  );
}
