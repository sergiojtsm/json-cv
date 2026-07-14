import type { ReactNode } from "react";
import {
  formatDateRange,
  formatLocation,
} from "../../resume/domain/formatting";
import type { Resume } from "../../resume/domain/generated/resume";

type Props = { resume: Resume };
type SectionProps = { title: string; children: ReactNode };

const Section = ({ title, children }: SectionProps) => (
  <section>
    <h2>{title}</h2>
    {children}
  </section>
);

const List = ({ items }: { items: string[] | undefined }) =>
  items?.length ? (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : null;

const Link = ({
  url,
  children,
}: {
  url: string | undefined;
  children: ReactNode;
}) => (url ? <a href={url}>{children}</a> : <>{children}</>);

const Entry = ({ children }: { children: ReactNode }) => (
  <article className="resume-entry" data-entry>
    {children}
  </article>
);

export function ResumeDocument({ resume }: Props) {
  const { basics } = resume;

  return (
    <article className="resume-document" data-resume-document>
      <header>
        <h1>{basics?.name}</h1>
        {basics?.label && <p className="resume-label">{basics.label}</p>}
        <address>
          {[formatLocation(basics?.location), basics?.phone]
            .filter(Boolean)
            .map((value) => (
              <span key={value}>{value}</span>
            ))}
          {basics?.email && (
            <a href={`mailto:${basics.email}`}>{basics.email}</a>
          )}
          {basics?.url && <a href={basics.url}>{basics.url}</a>}
          {basics?.profiles?.map((profile) => (
            <Link key={profile.url ?? profile.network} url={profile.url}>
              {profile.network}: {profile.username}
            </Link>
          ))}
        </address>
      </header>

      {basics?.summary && (
        <Section title="Profile">
          <p>{basics.summary}</p>
        </Section>
      )}

      {!!resume.work?.length && (
        <Section title="Experience">
          {resume.work.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <h3>
                {item.position} · <Link url={item.url}>{item.name}</Link>
              </h3>
              <p className="entry-meta">
                {[formatDateRange(item.startDate, item.endDate), item.location]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {item.summary && <p>{item.summary}</p>}
              <List items={item.highlights} />
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.volunteer?.length && (
        <Section title="Volunteer">
          {resume.volunteer.map((item, index) => (
            <Entry key={`${item.organization}-${index}`}>
              <h3>
                {item.position} ·{" "}
                <Link url={item.url}>{item.organization}</Link>
              </h3>
              <p className="entry-meta">
                {formatDateRange(item.startDate, item.endDate)}
              </p>
              {item.summary && <p>{item.summary}</p>}
              <List items={item.highlights} />
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.education?.length && (
        <Section title="Education">
          {resume.education.map((item, index) => (
            <Entry key={`${item.institution}-${index}`}>
              <h3>
                {item.studyType} {item.area} ·{" "}
                <Link url={item.url}>{item.institution}</Link>
              </h3>
              <p className="entry-meta">
                {formatDateRange(item.startDate, item.endDate)}
                {item.score ? ` · ${item.score}` : ""}
              </p>
              <List items={item.courses} />
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.awards?.length && (
        <Section title="Awards">
          {resume.awards.map((item, index) => (
            <Entry key={`${item.title}-${index}`}>
              <h3>{item.title}</h3>
              <p className="entry-meta">
                {[item.awarder, item.date].filter(Boolean).join(" · ")}
              </p>
              {item.summary && <p>{item.summary}</p>}
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.certificates?.length && (
        <Section title="Certificates">
          {resume.certificates.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <h3>
                <Link url={item.url}>{item.name}</Link>
              </h3>
              <p className="entry-meta">
                {[item.issuer, item.date].filter(Boolean).join(" · ")}
              </p>
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.publications?.length && (
        <Section title="Publications">
          {resume.publications.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <h3>
                <Link url={item.url}>{item.name}</Link>
              </h3>
              <p className="entry-meta">
                {[item.publisher, item.releaseDate].filter(Boolean).join(" · ")}
              </p>
              {item.summary && <p>{item.summary}</p>}
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.skills?.length && (
        <Section title="Skills">
          {resume.skills.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <h3>
                {item.name}
                {item.level ? ` · ${item.level}` : ""}
              </h3>
              {item.keywords?.length ? (
                <p>{item.keywords.join(" · ")}</p>
              ) : null}
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.languages?.length && (
        <Section title="Languages">
          {resume.languages.map((item, index) => (
            <p key={`${item.language}-${index}`}>
              <strong>{item.language}</strong>
              {item.fluency ? ` · ${item.fluency}` : ""}
            </p>
          ))}
        </Section>
      )}

      {!!resume.interests?.length && (
        <Section title="Interests">
          {resume.interests.map((item, index) => (
            <p key={`${item.name}-${index}`}>
              <strong>{item.name}</strong>
              {item.keywords?.length ? ` · ${item.keywords.join(" · ")}` : ""}
            </p>
          ))}
        </Section>
      )}

      {!!resume.references?.length && (
        <Section title="References">
          {resume.references.map((item, index) => (
            <blockquote key={`${item.name}-${index}`}>
              <p>{item.reference}</p>
              <cite>{item.name}</cite>
            </blockquote>
          ))}
        </Section>
      )}

      {!!resume.projects?.length && (
        <Section title="Projects">
          {resume.projects.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <h3>
                <Link url={item.url}>{item.name}</Link>
              </h3>
              <p className="entry-meta">
                {[
                  formatDateRange(item.startDate, item.endDate),
                  item.entity,
                  item.type,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {item.description && <p>{item.description}</p>}
              <List items={item.highlights} />
              {item.roles?.length ? (
                <p>
                  <strong>Roles:</strong> {item.roles.join(", ")}
                </p>
              ) : null}
              {item.keywords?.length ? (
                <p>
                  <strong>Keywords:</strong> {item.keywords.join(", ")}
                </p>
              ) : null}
            </Entry>
          ))}
        </Section>
      )}
    </article>
  );
}
