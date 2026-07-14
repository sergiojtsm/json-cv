import type { Resume } from "../resume/domain/generated/resume";

export const shortResume: Resume = {
  basics: {
    name: "Alex Morgan",
    label: "Senior Frontend Engineer",
    email: "alex@example.com",
    url: "https://example.com",
    summary: "Frontend engineer focused on accessible, resilient products.",
    location: { city: "Madrid", countryCode: "ES" },
  },
  work: [
    {
      name: "Acme",
      position: "Senior Frontend Engineer",
      startDate: "2022-03",
      summary: "Builds the customer-facing platform.",
      highlights: ["Improved Core Web Vitals across the product."],
    },
  ],
  skills: [
    { name: "Frontend", keywords: ["TypeScript", "React", "Accessibility"] },
  ],
};

export const completeResume: Resume = {
  $schema:
    "https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json",
  basics: {
    name: "Alex Morgan",
    label: "Senior Frontend Engineer",
    image: "https://example.com/photo.png",
    email: "alex@example.com",
    phone: "+34 600 000 000",
    url: "https://example.com",
    summary:
      "Frontend engineer with seven years of experience building accessible products.",
    location: {
      address: "Calle Mayor 1",
      postalCode: "28001",
      city: "Madrid",
      region: "Madrid",
      countryCode: "ES",
    },
    profiles: [
      {
        network: "LinkedIn",
        username: "alex",
        url: "https://linkedin.com/in/alex",
      },
    ],
  },
  work: [
    {
      name: "Acme",
      location: "Madrid",
      position: "Senior Frontend Engineer",
      url: "https://example.com/acme",
      startDate: "2022-03",
      description: "Customer platform engineering team.",
      summary: "Leads frontend architecture.",
      highlights: ["Reduced load time by 40%.", "Mentored six engineers."],
    },
  ],
  volunteer: [
    {
      organization: "Open Web Foundation",
      position: "Mentor",
      url: "https://example.com/foundation",
      startDate: "2021",
      summary: "Mentors junior developers.",
      highlights: ["Delivered twelve workshops."],
    },
  ],
  education: [
    {
      institution: "Technical University",
      url: "https://example.com/university",
      area: "Computer Science",
      studyType: "BSc",
      startDate: "2012",
      endDate: "2016",
      score: "8.7/10",
      courses: ["Distributed Systems", "Human Computer Interaction"],
    },
  ],
  awards: [
    {
      title: "Accessibility Champion",
      date: "2024",
      awarder: "Web Guild",
      summary: "Recognized for accessible product leadership.",
    },
  ],
  certificates: [
    {
      name: "Web Accessibility Specialist",
      date: "2023-04",
      issuer: "IAAP",
      url: "https://example.com/certificate",
    },
  ],
  publications: [
    {
      name: "Design Systems at Scale",
      publisher: "Frontend Journal",
      releaseDate: "2023-09",
      url: "https://example.com/article",
      summary: "A practical guide to federated design systems.",
    },
  ],
  skills: [
    {
      name: "Frontend",
      level: "Expert",
      keywords: ["TypeScript", "React", "CSS", "Accessibility"],
    },
  ],
  languages: [
    { language: "Spanish", fluency: "Native" },
    { language: "English", fluency: "Professional" },
  ],
  interests: [
    { name: "Open source", keywords: ["Web standards", "Developer tools"] },
  ],
  references: [
    {
      name: "Jordan Lee",
      reference: "Alex consistently delivers clear, maintainable systems.",
    },
  ],
  projects: [
    {
      name: "Accessible UI Kit",
      description: "An open-source component library.",
      highlights: ["Used by four product teams."],
      keywords: ["React", "ARIA"],
      startDate: "2021",
      endDate: "2024",
      url: "https://example.com/ui-kit",
      roles: ["Maintainer"],
      entity: "Open Web Foundation",
      type: "open-source",
    },
  ],
  meta: {
    canonical: "https://example.com/resume.json",
    version: "v1.0.0",
    lastModified: "2026-07-14T10:00:00",
  },
};

const baseWork = completeResume.work?.[0];
if (!baseWork) throw new Error("Complete fixture requires one work entry");

export const longResume: Resume = {
  ...completeResume,
  basics: {
    ...completeResume.basics,
    summary: `${completeResume.basics?.summary} ${"Detailed professional summary. ".repeat(8)}`,
  },
  work: Array.from({ length: 14 }, (_, index) => ({
    ...baseWork,
    name: `Company ${String(index + 1).padStart(2, "0")}`,
    startDate: `${2010 + index}`,
    endDate: `${2011 + index}`,
    highlights: Array.from(
      { length: index === 0 ? 45 : 5 },
      (__, highlight) =>
        `Delivered measurable result ${highlight + 1} for engagement ${index + 1}.`,
    ),
  })),
};
