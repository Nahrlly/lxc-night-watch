# OpenClaw Night Watch

This is a tiny script-only inspection loop.

## Loop

1. Wake: run the watcher script.
2. Inspect: query the remote solar irradiance endpoint.
3. Decide: classify the reading as `NORMAL`, `INCIDENT`, or `RECOVERED`.
4. Record: append the observation and update the incident log.
5. Report: print either `NO_REPLY` or the required Discord alert/recovery message.

## Files

- `night-watch.mjs`: runs the inspection and updates state.
- `ORDERS.md`: operating instructions for each inspection.
- `observations.md`: append-only inspection history.
- `incidents.md`: one row per low-sunlight episode.

## Run

```bash
wsl.exe bash -lc 'node night-watch.mjs'
```
