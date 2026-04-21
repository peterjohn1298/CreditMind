"use client";
import { useEffect, useState } from "react";

interface Props {
  text: string;
  speed?: number;
  className?: string;
}

export default function TypewriterText({ text, speed = 10, className }: Props) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <span className={className}>
      {displayed}
      {displayed.length < text.length && (
        <span style={{
          display: "inline-block", width: 1, height: "0.85em",
          background: "#5B6BFF", marginLeft: 2, verticalAlign: "text-bottom",
          animation: "blink 0.6s step-end infinite",
        }} />
      )}
    </span>
  );
}
