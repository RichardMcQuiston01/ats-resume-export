import type { StandardSchemaV1 } from './standard-schema';
import {
  MAX_SCREENSHOT_DATA_URL_LENGTH,
  RECOMMENDATION_RELATIONSHIPS,
  RESUME_SCHEMA_VERSION,
  SECTION_KEYS,
  type Resume,
  type SectionKey,
} from './types';

/** One validation problem, located by a path such as `['experience', 0, 'startDate']`. */
export interface ValidationIssue {
  path: Array<string | number>;
  message: string;
}

export type ParseResult<T> =
  { success: true; data: T } | { success: false; issues: ValidationIssue[] };

type Path = Array<string | number>;
type UnknownRecord = Record<string, unknown>;

const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const IMAGE_DATA_URL_PATTERN =
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Collects issues and builds normalized (defaults applied) output. */
class Checker {
  readonly issues: ValidationIssue[] = [];

  fail(path: Path, message: string): void {
    this.issues.push({ path: [...path], message });
  }

  string(
    source: UnknownRecord,
    key: string,
    path: Path,
    options: { nonEmpty?: boolean; optional?: boolean } = {}
  ): string | undefined {
    const value = source[key];
    const fieldPath = [...path, key];
    if (value === undefined) {
      if (!options.optional) {
        this.fail(
          fieldPath,
          'Invalid input: expected string, received undefined'
        );
      }
      return undefined;
    }
    if (typeof value !== 'string') {
      this.fail(fieldPath, 'Invalid input: expected string');
      return undefined;
    }
    if (options.nonEmpty && value.length === 0) {
      this.fail(fieldPath, 'Too small: expected string to have >=1 characters');
    }
    return value;
  }

  patterned(
    source: UnknownRecord,
    key: string,
    path: Path,
    test: (value: string) => boolean,
    message: string,
    optional = false
  ): string | undefined {
    const value = this.string(source, key, path, { optional });
    if (value !== undefined && !test(value)) {
      this.fail([...path, key], message);
    }
    return value;
  }

  uuid(source: UnknownRecord, key: string, path: Path): string | undefined {
    return this.patterned(
      source,
      key,
      path,
      (v) => UUID_PATTERN.test(v),
      'Invalid UUID'
    );
  }

  url(
    source: UnknownRecord,
    key: string,
    path: Path,
    optional = false
  ): string | undefined {
    return this.patterned(
      source,
      key,
      path,
      isValidUrl,
      'Invalid URL',
      optional
    );
  }

  yearMonth(
    source: UnknownRecord,
    key: string,
    path: Path,
    optional = false
  ): string | undefined {
    return this.patterned(
      source,
      key,
      path,
      (v) => YEAR_MONTH_PATTERN.test(v),
      'Expected a date in YYYY-MM format.',
      optional
    );
  }

  boolean(source: UnknownRecord, key: string, path: Path): boolean {
    const value = source[key];
    if (typeof value !== 'boolean') {
      this.fail([...path, key], 'Invalid input: expected boolean');
      return false;
    }
    return value;
  }

  /** Reads an array (missing => `[]`) and maps each record element. */
  array<T>(
    source: UnknownRecord,
    key: string,
    path: Path,
    mapItem: (item: UnknownRecord, itemPath: Path) => T,
    options: { min?: number } = {}
  ): T[] {
    const value = source[key];
    const arrayPath = [...path, key];
    if (value === undefined) {
      if (options.min) {
        this.fail(
          arrayPath,
          'Invalid input: expected array, received undefined'
        );
      }
      return [];
    }
    if (!Array.isArray(value)) {
      this.fail(arrayPath, 'Invalid input: expected array');
      return [];
    }
    if (options.min && value.length < options.min) {
      this.fail(
        arrayPath,
        `Too small: expected array to have >=${options.min} items`
      );
    }
    const items: T[] = [];
    value.forEach((item: unknown, index: number) => {
      const itemPath = [...arrayPath, index];
      if (!isRecord(item)) {
        this.fail(itemPath, 'Invalid input: expected object');
        return;
      }
      items.push(mapItem(item, itemPath));
    });
    return items;
  }

  /** Reads an array of non-empty strings (missing => `[]`). */
  strings(
    source: UnknownRecord,
    key: string,
    path: Path,
    options: { min?: number } = {}
  ): string[] {
    const value = source[key];
    const arrayPath = [...path, key];
    if (value === undefined) {
      if (options.min) {
        this.fail(
          arrayPath,
          'Invalid input: expected array, received undefined'
        );
      }
      return [];
    }
    if (!Array.isArray(value)) {
      this.fail(arrayPath, 'Invalid input: expected array');
      return [];
    }
    if (options.min && value.length < options.min) {
      this.fail(
        arrayPath,
        `Too small: expected array to have >=${options.min} items`
      );
    }
    const items: string[] = [];
    value.forEach((item: unknown, index: number) => {
      if (typeof item !== 'string') {
        this.fail([...arrayPath, index], 'Invalid input: expected string');
      } else if (item.length === 0) {
        this.fail(
          [...arrayPath, index],
          'Too small: expected string to have >=1 characters'
        );
      } else {
        items.push(item);
      }
    });
    return items;
  }

  object(
    source: UnknownRecord,
    key: string,
    path: Path
  ): UnknownRecord | undefined {
    const value = source[key];
    if (value === undefined) {
      this.fail(
        [...path, key],
        'Invalid input: expected object, received undefined'
      );
      return undefined;
    }
    if (!isRecord(value)) {
      this.fail([...path, key], 'Invalid input: expected object');
      return undefined;
    }
    return value;
  }
}

/** Reads the optional `sectionOrder`: known section keys, no duplicates. */
function readSectionOrder(
  checker: Checker,
  input: UnknownRecord
): SectionKey[] | undefined {
  const value = input.sectionOrder;
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    checker.fail(['sectionOrder'], 'Invalid input: expected array');
    return undefined;
  }
  const order: SectionKey[] = [];
  value.forEach((entry: unknown, index: number) => {
    const key = SECTION_KEYS.find((candidate) => candidate === entry);
    if (key === undefined) {
      checker.fail(
        ['sectionOrder', index],
        `Invalid option: expected one of ${SECTION_KEYS.join('|')}`
      );
    } else if (order.includes(key)) {
      checker.fail(['sectionOrder', index], 'Duplicate section');
    } else {
      order.push(key);
    }
  });
  return order;
}

/** Drops keys whose value is `undefined`, keeping output shape tidy. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}

function readResume(input: unknown): ParseResult<Resume> {
  const c = new Checker();
  if (!isRecord(input)) {
    return {
      success: false,
      issues: [{ path: [], message: 'Invalid input: expected object' }],
    };
  }

  if (input.schemaVersion !== RESUME_SCHEMA_VERSION) {
    c.fail(
      ['schemaVersion'],
      `Invalid input: expected ${RESUME_SCHEMA_VERSION}`
    );
  }
  const id = c.uuid(input, 'id', []);
  const isoDatetime = (key: string): string | undefined =>
    c.patterned(
      input,
      key,
      [],
      (v) => ISO_DATETIME_PATTERN.test(v) && !Number.isNaN(Date.parse(v)),
      'Invalid ISO datetime'
    );
  const createdAt = isoDatetime('createdAt');
  const updatedAt = isoDatetime('updatedAt');

  const contactSource = c.object(input, 'contact', []);
  const contactPath: Path = ['contact'];
  let contact: Resume['contact'] | undefined;
  if (contactSource) {
    contact = compact({
      fullName:
        c.string(contactSource, 'fullName', contactPath, {
          nonEmpty: true,
        }) ?? '',
      email:
        c.patterned(
          contactSource,
          'email',
          contactPath,
          (v) => EMAIL_PATTERN.test(v),
          'Invalid email address'
        ) ?? '',
      phone: c.string(contactSource, 'phone', contactPath, {
        nonEmpty: true,
        optional: true,
      }),
      location: c.string(contactSource, 'location', contactPath, {
        nonEmpty: true,
        optional: true,
      }),
      links: c.array(contactSource, 'links', contactPath, (item, p) => ({
        id: c.uuid(item, 'id', p) ?? '',
        label: c.string(item, 'label', p, { nonEmpty: true }) ?? '',
        url: c.url(item, 'url', p) ?? '',
      })),
    });
  }

  const optionalText = (
    source: UnknownRecord,
    key: string,
    path: Path
  ): string | undefined =>
    c.string(source, key, path, { nonEmpty: true, optional: true });

  const experience = c.array(input, 'experience', [], (item, p) => {
    const isCurrent = c.boolean(item, 'isCurrent', p);
    const endDate = c.yearMonth(item, 'endDate', p, true);
    if (!isCurrent && endDate === undefined) {
      c.fail(
        [...p, 'endDate'],
        'endDate is required unless isCurrent is true.'
      );
    }
    return compact({
      id: c.uuid(item, 'id', p) ?? '',
      company: c.string(item, 'company', p, { nonEmpty: true }) ?? '',
      title: c.string(item, 'title', p, { nonEmpty: true }) ?? '',
      location: optionalText(item, 'location', p),
      startDate: c.yearMonth(item, 'startDate', p) ?? '',
      endDate,
      isCurrent,
      highlights: c.strings(item, 'highlights', p, { min: 1 }),
    });
  });

  const education = c.array(input, 'education', [], (item, p) =>
    compact({
      id: c.uuid(item, 'id', p) ?? '',
      institution: c.string(item, 'institution', p, { nonEmpty: true }) ?? '',
      credential: c.string(item, 'credential', p, { nonEmpty: true }) ?? '',
      location: optionalText(item, 'location', p),
      startDate: c.yearMonth(item, 'startDate', p, true),
      endDate: c.yearMonth(item, 'endDate', p, true),
      isCurrent: c.boolean(item, 'isCurrent', p),
      highlights: c.strings(item, 'highlights', p),
    })
  );

  const skills = c.array(input, 'skills', [], (item, p) => ({
    id: c.uuid(item, 'id', p) ?? '',
    category: c.string(item, 'category', p, { nonEmpty: true }) ?? '',
    skills: c.strings(item, 'skills', p, { min: 1 }),
  }));

  const certifications = c.array(input, 'certifications', [], (item, p) =>
    compact({
      id: c.uuid(item, 'id', p) ?? '',
      name: c.string(item, 'name', p, { nonEmpty: true }) ?? '',
      issuer: c.string(item, 'issuer', p, { nonEmpty: true }) ?? '',
      issueDate: c.yearMonth(item, 'issueDate', p, true),
      expirationDate: c.yearMonth(item, 'expirationDate', p, true),
      credentialUrl: c.url(item, 'credentialUrl', p, true),
    })
  );

  const projects = c.array(input, 'projects', [], (item, p) =>
    compact({
      id: c.uuid(item, 'id', p) ?? '',
      name: c.string(item, 'name', p, { nonEmpty: true }) ?? '',
      description: c.string(item, 'description', p, { nonEmpty: true }) ?? '',
      url: c.url(item, 'url', p, true),
      highlights: c.strings(item, 'highlights', p),
      techStack: c.strings(item, 'techStack', p),
      repoUrl: c.url(item, 'repoUrl', p, true),
      demoUrl: c.url(item, 'demoUrl', p, true),
      outcome: optionalText(item, 'outcome', p),
      screenshots: c.array(item, 'screenshots', p, (shot, sp) => {
        const dataUrl = c.string(shot, 'dataUrl', sp);
        if (dataUrl !== undefined) {
          if (dataUrl.length > MAX_SCREENSHOT_DATA_URL_LENGTH) {
            c.fail(
              [...sp, 'dataUrl'],
              `Too big: expected string to have <=${MAX_SCREENSHOT_DATA_URL_LENGTH} characters`
            );
          }
          if (!IMAGE_DATA_URL_PATTERN.test(dataUrl)) {
            c.fail(
              [...sp, 'dataUrl'],
              'Expected a base64 PNG, JPEG, or WebP data URL.'
            );
          }
        }
        return {
          id: c.uuid(shot, 'id', sp) ?? '',
          dataUrl: dataUrl ?? '',
          altText: c.string(shot, 'altText', sp, { nonEmpty: true }) ?? '',
        };
      }),
    })
  );

  const portfolioSource = isRecord(input.portfolio) ? input.portfolio : {};
  if (input.portfolio !== undefined && !isRecord(input.portfolio)) {
    c.fail(['portfolio'], 'Invalid input: expected object');
  }
  const portfolioPath: Path = ['portfolio'];
  const portfolioIds = portfolioSource.featuredProjectIds;
  const featured: string[] = [];
  if (portfolioIds !== undefined) {
    if (!Array.isArray(portfolioIds)) {
      c.fail(
        [...portfolioPath, 'featuredProjectIds'],
        'Invalid input: expected array'
      );
    } else {
      portfolioIds.forEach((entry: unknown, index: number) => {
        if (typeof entry !== 'string' || !UUID_PATTERN.test(entry)) {
          c.fail(
            [...portfolioPath, 'featuredProjectIds', index],
            'Invalid UUID'
          );
        } else {
          featured.push(entry);
        }
      });
    }
  }
  const recommendations = c.array(
    portfolioSource,
    'recommendations',
    portfolioPath,
    (item, p) => {
      const relationship = item.relationship;
      const validRelationship = RECOMMENDATION_RELATIONSHIPS.find(
        (candidate) => candidate === relationship
      );
      if (validRelationship === undefined) {
        c.fail(
          [...p, 'relationship'],
          `Invalid option: expected one of ${RECOMMENDATION_RELATIONSHIPS.join('|')}`
        );
      }
      return compact({
        id: c.uuid(item, 'id', p) ?? '',
        authorName: c.string(item, 'authorName', p, { nonEmpty: true }) ?? '',
        authorTitle: optionalText(item, 'authorTitle', p),
        authorCompany: optionalText(item, 'authorCompany', p),
        relationship: validRelationship ?? 'other',
        quote: c.string(item, 'quote', p, { nonEmpty: true }) ?? '',
        sourceUrl: c.url(item, 'sourceUrl', p, true),
        hasAuthorPermission: c.boolean(item, 'hasAuthorPermission', p),
      });
    }
  );

  const sectionOrder = readSectionOrder(c, input);

  if (c.issues.length > 0 || !contact) {
    return { success: false, issues: c.issues };
  }

  return {
    success: true,
    data: compact({
      schemaVersion: RESUME_SCHEMA_VERSION,
      id: id ?? '',
      createdAt: createdAt ?? '',
      updatedAt: updatedAt ?? '',
      contact,
      summary: optionalText(input, 'summary', []),
      experience,
      education,
      skills,
      certifications,
      projects,
      portfolio: compact({
        bio: optionalText(portfolioSource, 'bio', portfolioPath),
        featuredProjectIds: featured,
        recommendations,
      }),
      sectionOrder,
    }),
  };
}

/** Validates `input` without throwing; applies defaults for missing arrays. */
export function safeParseResume(input: unknown): ParseResult<Resume> {
  return readResume(input);
}

/** Validates `input`, throwing a descriptive `Error` listing every issue. */
export function parseResume(input: unknown): Resume {
  const result = readResume(input);
  if (!result.success) {
    const details = result.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid resume: ${details}`);
  }
  return result.data;
}

/**
 * The built-in validator exposed as a Standard Schema, so it can be passed
 * anywhere a Zod / Valibot / ArkType schema can.
 */
export const resumeValidator: StandardSchemaV1<unknown, Resume> = {
  '~standard': {
    version: 1,
    vendor: 'ats-resume-export',
    validate: (value: unknown) => {
      const result = readResume(value);
      return result.success
        ? { value: result.data }
        : { issues: result.issues };
    },
  },
};
