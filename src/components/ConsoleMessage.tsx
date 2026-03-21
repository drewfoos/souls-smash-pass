"use client";

import { useEffect } from "react";

export function ConsoleMessage() {
  useEffect(() => {
    console.log(
      "%c⚔ ELDEN SMASH ⚔",
      "color: #FFD700; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 0 #1a1a2e;"
    );
    console.log(
      "%cYou opened the console. Bold. Just like fighting Malenia at level 1.",
      "color: #c4a882; font-size: 13px;"
    );
    console.log(
      "%cBuilt by @drewfoos — https://github.com/drewfoos",
      "color: #7b8db5; font-size: 11px;"
    );
    console.log(
      "%cWe know you smashed Ranni. Everyone did.",
      "color: #6e5494; font-size: 11px; font-style: italic;"
    );
  }, []);

  return null;
}
