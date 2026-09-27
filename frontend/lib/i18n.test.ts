import { DEFAULT_LOCALE, formatDate, formatNumber, getLocale, t } from "./i18n";

describe("i18n", () => {
  it("uses English by default and interpolates catalogue messages", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(getLocale("unsupported")).toBe("en");
    expect(t("proposals.summary", { total: 12, active: 3 })).toBe("12 proposals · 3 active");
  });

  it("formats numbers and dates through Intl", () => {
    expect(formatNumber(1234, undefined, "en")).toBe("1,234");
    expect(formatDate("2026-09-26T00:00:00Z", { timeZone: "UTC" }, "en")).toMatch(/9\/26\/2026/);
  });
});
