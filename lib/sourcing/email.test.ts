import { expect, test } from "vitest";
import { emailText, mailtoLink } from "./email";

test("mailtoLink opens a new email with the subject and body encoded", () => {
  const link = mailtoLink("sales@factory.example", "RFQ: CNC enclosure, 250 pcs", "Hello,\nPlease quote & advise.");
  expect(link).toBe("mailto:sales@factory.example?subject=RFQ%3A%20CNC%20enclosure%2C%20250%20pcs&body=Hello%2C%0APlease%20quote%20%26%20advise.");
  expect(link).not.toContain("+");
});

test("mailtoLink works without an address or subject", () => {
  expect(mailtoLink(undefined, undefined, "Hi")).toBe("mailto:?body=Hi");
});

test("emailText puts the subject on top when there is one", () => {
  expect(emailText("Re: RFQ", "Thanks")).toBe("Subject: Re: RFQ\n\nThanks");
  expect(emailText(undefined, "Thanks")).toBe("Thanks");
});
