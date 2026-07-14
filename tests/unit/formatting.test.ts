import { describe, expect, it } from "vitest";
import {
  formatDateRange,
  formatLocation,
} from "../../src/resume/domain/formatting";

describe("resume formatting", () => {
  it("formats open and closed date ranges without inventing dates", () => {
    expect(formatDateRange("2022-03", undefined)).toBe("2022-03 – Present");
    expect(formatDateRange("2019", "2022-02")).toBe("2019 – 2022-02");
    expect(formatDateRange(undefined, undefined)).toBe("");
  });

  it("joins only populated location parts", () => {
    expect(
      formatLocation({ city: "Madrid", region: "Madrid", countryCode: "ES" }),
    ).toBe("Madrid, Madrid, ES");
  });
});
