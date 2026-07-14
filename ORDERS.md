# ORDERS

Each inspection must:

1. Query `https://planet.turingguild.com/world/solar-irradiance`.
2. Read `solarIrradiance.wPerM2` and `solarIrradiance.condition` from the JSON response.
3. Classify the reading as:
   - `NORMAL` when `wPerM2` is `450` or greater and there is no open incident.
   - `INCIDENT` when `wPerM2` is below `450`.
   - `RECOVERED` when `wPerM2` returns to `450` or greater after an incident.
4. Append the timestamp, `wPerM2`, condition, classification, and a short note to `observations.md`.
5. Update `incidents.md` so there is one incident per low-sunlight episode:
   - create the incident when the reading first crosses below `450`
   - update the same incident while the reading remains below `450`
   - add the recovery time and mark the incident recovered when the reading returns to `450` or greater
6. Compare the new classification with the most recent observation and report using the required final-response rules.

Final-response rules:

- `NORMAL` with no state change: return exactly `NO_REPLY`
- first transition into `INCIDENT`: return one concise Discord alert with the timestamp and `wPerM2` reading
- continued `INCIDENT` with no state change: return exactly `NO_REPLY`
- transition from `INCIDENT` to `RECOVERED`: return one concise Discord recovery message with the timestamp and `wPerM2` reading
- continued normal operation after recovery: return exactly `NO_REPLY`
