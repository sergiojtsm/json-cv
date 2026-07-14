import type { ReactNode } from "react";
import {
  formatDateRange,
  formatLocation,
} from "../../resume/domain/formatting";
import type { Resume } from "../../resume/domain/generated/resume";

type Props = { resume: Resume };
type SectionProps = { title: string; children: ReactNode };

const hasText = (value: string | null | undefined): value is string =>
  Boolean(value?.trim());
const hasAnyText = (...values: (string | null | undefined)[]) =>
  values.some(hasText);
const hasListContent = (items: string[] | undefined) =>
  Boolean(items?.some(hasText));

const Section = ({ title, children }: SectionProps) => (
  <section>
    <h2>{title}</h2>
    {children}
  </section>
);

const List = ({ items }: { items: string[] | undefined }) => {
  const visibleItems = items?.filter(hasText) ?? [];

  return visibleItems.length ? (
    <ul>
      {visibleItems.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  ) : null;
};

const Link = ({
  url,
  children,
}: {
  url: string | undefined;
  children: ReactNode;
}) => (hasText(url) ? <a href={url}>{children}</a> : <>{children}</>);

const Entry = ({ children }: { children: ReactNode }) => (
  <article className="resume-entry" data-entry>
    {children}
  </article>
);

const EntryHeading = ({
  primary,
  secondary,
  secondaryUrl,
}: {
  primary: string | undefined;
  secondary: string | undefined;
  secondaryUrl: string | undefined;
}) =>
  hasAnyText(primary, secondary) ? (
    <h3>
      {hasText(primary) && primary}
      {hasText(primary) && hasText(secondary) ? " · " : ""}
      {hasText(secondary) && <Link url={secondaryUrl}>{secondary}</Link>}
    </h3>
  ) : null;

const EntryMeta = ({ parts }: { parts: (string | undefined)[] }) => {
  const content = parts.filter(hasText).join(" · ");
  return content ? <p className="entry-meta">{content}</p> : null;
};

export function ResumeDocument({ resume }: Props) {
  const { basics } = resume;
  const location = formatLocation(basics?.location);
  const locationLines = [
    basics?.location?.address,
    [basics?.location?.postalCode, location].filter(hasText).join(" "),
  ].filter(hasText);
  const profiles =
    basics?.profiles?.filter((profile) =>
      hasAnyText(profile.network, profile.username, profile.url),
    ) ?? [];
  const hasContact = Boolean(
    locationLines.length ||
    hasText(basics?.phone) ||
    hasText(basics?.email) ||
    hasText(basics?.url) ||
    profiles.length,
  );
  const hasHeader = Boolean(
    hasText(basics?.name) || hasText(basics?.label) || hasContact,
  );
  const work =
    resume.work?.filter(
      (item) =>
        hasAnyText(
          item.name,
          item.location,
          item.position,
          item.url,
          item.startDate,
          item.endDate,
          item.description,
          item.summary,
        ) || hasListContent(item.highlights),
    ) ?? [];
  const volunteer =
    resume.volunteer?.filter(
      (item) =>
        hasAnyText(
          item.organization,
          item.position,
          item.url,
          item.startDate,
          item.endDate,
          item.summary,
        ) || hasListContent(item.highlights),
    ) ?? [];
  const education =
    resume.education?.filter(
      (item) =>
        hasAnyText(
          item.institution,
          item.url,
          item.area,
          item.studyType,
          item.startDate,
          item.endDate,
          item.score,
        ) || hasListContent(item.courses),
    ) ?? [];
  const awards =
    resume.awards?.filter((item) =>
      hasAnyText(item.title, item.awarder, item.date, item.summary),
    ) ?? [];
  const certificates =
    resume.certificates?.filter((item) =>
      hasAnyText(item.name, item.issuer, item.date, item.url),
    ) ?? [];
  const publications =
    resume.publications?.filter((item) =>
      hasAnyText(
        item.name,
        item.publisher,
        item.releaseDate,
        item.url,
        item.summary,
      ),
    ) ?? [];
  const skills =
    resume.skills?.filter(
      (item) =>
        hasAnyText(item.name, item.level) || hasListContent(item.keywords),
    ) ?? [];
  const languages =
    resume.languages?.filter((item) =>
      hasAnyText(item.language, item.fluency),
    ) ?? [];
  const interests =
    resume.interests?.filter(
      (item) => hasText(item.name) || hasListContent(item.keywords),
    ) ?? [];
  const references =
    resume.references?.filter((item) =>
      hasAnyText(item.name, item.reference),
    ) ?? [];
  const projects =
    resume.projects?.filter(
      (item) =>
        hasAnyText(
          item.name,
          item.description,
          item.startDate,
          item.endDate,
          item.url,
          item.entity,
          item.type,
        ) ||
        hasListContent(item.highlights) ||
        hasListContent(item.keywords) ||
        hasListContent(item.roles),
    ) ?? [];

  return (
    <article className="resume-document" data-resume-document>
      {hasHeader && (
        <header>
          {hasText(basics?.name) && <h1>{basics.name}</h1>}
          {hasText(basics?.label) && (
            <p className="resume-label">{basics.label}</p>
          )}
          {hasContact && (
            <address>
              {[...locationLines, basics?.phone]
                .filter(hasText)
                .map((value, index) => (
                  <span key={`${value}-${index}`}>{value}</span>
                ))}
              {hasText(basics?.email) && (
                <a href={`mailto:${basics.email}`}>{basics.email}</a>
              )}
              {hasText(basics?.url) && <a href={basics.url}>{basics.url}</a>}
              {profiles.map((profile, index) => (
                <Link
                  key={`${profile.url ?? profile.network ?? profile.username}-${index}`}
                  url={profile.url}
                >
                  {[profile.network, profile.username]
                    .filter(hasText)
                    .join(": ") || profile.url}
                </Link>
              ))}
            </address>
          )}
        </header>
      )}

      {hasText(basics?.summary) && (
        <Section title="Profile">
          <p>{basics.summary}</p>
        </Section>
      )}

      {!!work.length && (
        <Section title="Experience">
          {work.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <EntryHeading
                primary={item.position}
                secondary={item.name}
                secondaryUrl={item.url}
              />
              <EntryMeta
                parts={[
                  formatDateRange(item.startDate, item.endDate),
                  item.location,
                ]}
              />
              {hasText(item.description) && <p>{item.description}</p>}
              {hasText(item.summary) && <p>{item.summary}</p>}
              <List items={item.highlights} />
            </Entry>
          ))}
        </Section>
      )}

      {!!volunteer.length && (
        <Section title="Volunteer">
          {volunteer.map((item, index) => (
            <Entry key={`${item.organization}-${index}`}>
              <EntryHeading
                primary={item.position}
                secondary={item.organization}
                secondaryUrl={item.url}
              />
              <EntryMeta
                parts={[formatDateRange(item.startDate, item.endDate)]}
              />
              {hasText(item.summary) && <p>{item.summary}</p>}
              <List items={item.highlights} />
            </Entry>
          ))}
        </Section>
      )}

      {!!education.length && (
        <Section title="Education">
          {education.map((item, index) => (
            <Entry key={`${item.institution}-${index}`}>
              <EntryHeading
                primary={[item.studyType, item.area].filter(hasText).join(" ")}
                secondary={item.institution}
                secondaryUrl={item.url}
              />
              <EntryMeta
                parts={[
                  formatDateRange(item.startDate, item.endDate),
                  item.score,
                ]}
              />
              <List items={item.courses} />
            </Entry>
          ))}
        </Section>
      )}

      {!!awards.length && (
        <Section title="Awards">
          {awards.map((item, index) => (
            <Entry key={`${item.title}-${index}`}>
              <EntryHeading
                primary={item.title}
                secondary={undefined}
                secondaryUrl={undefined}
              />
              <EntryMeta parts={[item.awarder, item.date]} />
              {hasText(item.summary) && <p>{item.summary}</p>}
            </Entry>
          ))}
        </Section>
      )}

      {!!certificates.length && (
        <Section title="Certificates">
          {certificates.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <EntryHeading
                primary={undefined}
                secondary={hasText(item.name) ? item.name : item.url}
                secondaryUrl={item.url}
              />
              <EntryMeta parts={[item.issuer, item.date]} />
            </Entry>
          ))}
        </Section>
      )}

      {!!publications.length && (
        <Section title="Publications">
          {publications.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <EntryHeading
                primary={undefined}
                secondary={hasText(item.name) ? item.name : item.url}
                secondaryUrl={item.url}
              />
              <EntryMeta parts={[item.publisher, item.releaseDate]} />
              {hasText(item.summary) && <p>{item.summary}</p>}
            </Entry>
          ))}
        </Section>
      )}

      {!!skills.length && (
        <Section title="Skills">
          {skills.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <EntryHeading
                primary={item.name}
                secondary={item.level}
                secondaryUrl={undefined}
              />
              {hasListContent(item.keywords) ? (
                <p>{item.keywords?.filter(hasText).join(" · ")}</p>
              ) : null}
            </Entry>
          ))}
        </Section>
      )}

      {!!languages.length && (
        <Section title="Languages">
          {languages.map((item, index) => (
            <p key={`${item.language}-${index}`}>
              {hasText(item.language) && <strong>{item.language}</strong>}
              {hasText(item.language) && hasText(item.fluency) ? " · " : ""}
              {hasText(item.fluency) && item.fluency}
            </p>
          ))}
        </Section>
      )}

      {!!interests.length && (
        <Section title="Interests">
          {interests.map((item, index) => (
            <p key={`${item.name}-${index}`}>
              {hasText(item.name) && <strong>{item.name}</strong>}
              {hasText(item.name) && hasListContent(item.keywords) ? " · " : ""}
              {item.keywords?.filter(hasText).join(" · ")}
            </p>
          ))}
        </Section>
      )}

      {!!references.length && (
        <Section title="References">
          {references.map((item, index) => (
            <blockquote key={`${item.name}-${index}`}>
              {hasText(item.reference) && <p>{item.reference}</p>}
              {hasText(item.name) && <cite>{item.name}</cite>}
            </blockquote>
          ))}
        </Section>
      )}

      {!!projects.length && (
        <Section title="Projects">
          {projects.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <EntryHeading
                primary={undefined}
                secondary={hasText(item.name) ? item.name : item.url}
                secondaryUrl={item.url}
              />
              <EntryMeta
                parts={[
                  formatDateRange(item.startDate, item.endDate),
                  item.entity,
                  item.type,
                ]}
              />
              {hasText(item.description) && <p>{item.description}</p>}
              <List items={item.highlights} />
              {hasListContent(item.roles) ? (
                <p>
                  <strong>Roles:</strong>{" "}
                  {item.roles?.filter(hasText).join(", ")}
                </p>
              ) : null}
              {hasListContent(item.keywords) ? (
                <p>
                  <strong>Keywords:</strong>{" "}
                  {item.keywords?.filter(hasText).join(", ")}
                </p>
              ) : null}
            </Entry>
          ))}
        </Section>
      )}
    </article>
  );
}
