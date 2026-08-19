/**
 * What the hardware in this build actually has.
 *
 * Confirmed against the band's wiring, 19 August 2026: an ESP32-C3 Super
 * Mini carrying a MAX30102 and an MPU6050 on one I2C bus, a vibration
 * motor, a push button, and a UART to the ESP32-S3 that drives the watch
 * screen. Nothing else.
 *
 * Kept here rather than discovered at runtime because a feature that
 * cannot work must not appear as a button and then explain itself. The
 * band can refuse `ecg_start`, but by then somebody has already tapped
 * Record ECG, put a finger on a contact that does not exist, and waited.
 */

/** No AD8232 in the circuit. §3.10 and characteristic `000A` stay in the
 *  contract — the firmware answers them the moment one is fitted — but
 *  there is nothing to record from today. */
export const HAS_ECG = false;

/** No voltage divider on the battery, so §3.6 reports 255 and the app
 *  shows a dash. Fitting one is a wiring change, not a code change. */
export const HAS_BATTERY_GAUGE = false;
