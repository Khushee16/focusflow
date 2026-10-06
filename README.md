# FocusFlow — Pomodoro Timer

A clean, focused Pomodoro timer app for deep-work sessions. Adjustable work/break lengths, automatic break cycling, a daily task list, and session stats — all persisted locally.

## Features

- Start / pause / reset timer with a smooth SVG progress ring
- Focus, short-break, and long-break modes; auto-switches after each session (long break every 4 sessions)
- Adjustable timer lengths via steppers (persisted)
- Task list: add, complete, delete — saved in localStorage
- Daily stats: completed focus sessions, focus minutes, tasks done (resets each day)
- Gentle WebAudio chime when a session ends; live countdown in the browser tab title
- Fully responsive, mobile-friendly layout

## Tech

HTML, CSS (custom properties, flexbox/grid), vanilla JavaScript. No frameworks, no build step — just open `index.html`.

## Live demo

https://khushee16.github.io/focusflow/
