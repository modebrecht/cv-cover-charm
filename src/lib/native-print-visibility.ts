/**
 * Keep the experimental native printing path accessible to opt-in regression QA,
 * but not as a normal product export choice. Automatic PDF is the only default UI.
 */
export function nativePrintUiEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("native-print-qa") === "1"
  );
}
