import { createId } from './id';
import { RESUME_SCHEMA_VERSION, type Resume } from '../types';

/**
 * A fully populated, schema-valid resume used by tests and by the builder
 * UI during local development.
 */
export function createFixtureResume(): Resume {
  const projectId = createId();

  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    id: createId(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    contact: {
      fullName: 'Jordan Rivera',
      email: 'jordan.rivera@example.com',
      phone: '555-010-0100',
      location: 'Austin, TX',
      links: [
        {
          id: createId(),
          label: 'LinkedIn',
          url: 'https://www.linkedin.com/in/jordan-rivera',
        },
        {
          id: createId(),
          label: 'GitHub',
          url: 'https://github.com/jordan-rivera',
        },
      ],
    },
    summary:
      'Full-stack engineer with 6 years of experience building customer-facing web applications.',
    experience: [
      {
        id: createId(),
        company: 'Acme Corp',
        title: 'Senior Software Engineer',
        location: 'Remote',
        startDate: '2022-03',
        isCurrent: true,
        highlights: [
          'Led migration of the checkout service to TypeScript, cutting production incidents by 40%.',
          'Mentored two junior engineers through onboarding and their first on-call rotation.',
        ],
      },
      {
        id: createId(),
        company: 'Globex Inc',
        title: 'Software Engineer',
        location: 'Austin, TX',
        startDate: '2019-06',
        endDate: '2022-02',
        isCurrent: false,
        highlights: [
          'Built an internal reporting dashboard used by 50+ operations staff.',
        ],
      },
    ],
    education: [
      {
        id: createId(),
        institution: 'University of Texas at Austin',
        credential: 'B.S. Computer Science',
        location: 'Austin, TX',
        startDate: '2015-08',
        endDate: '2019-05',
        isCurrent: false,
        highlights: [],
      },
    ],
    skills: [
      {
        id: createId(),
        category: 'Languages',
        skills: ['TypeScript', 'Go', 'Python'],
      },
      {
        id: createId(),
        category: 'Frameworks',
        skills: ['React', 'Next.js', 'Vite'],
      },
    ],
    certifications: [
      {
        id: createId(),
        name: 'AWS Certified Solutions Architect – Associate',
        issuer: 'Amazon Web Services',
        issueDate: '2023-05',
        expirationDate: '2026-05',
      },
    ],
    projects: [
      {
        id: projectId,
        name: 'Hired Hand: Resume Builder',
        description:
          'Chrome extension for building and exporting ATS-compatible resumes.',
        url: 'https://github.com/RichardMcQuiston01/hired-hand-resume-builder',
        highlights: [],
        techStack: ['TypeScript', 'React', 'Vite', 'Tailwind CSS'],
        repoUrl:
          'https://github.com/RichardMcQuiston01/hired-hand-resume-builder',
        outcome: 'Exports ATS-checked resumes to five formats from one editor.',
        screenshots: [
          {
            id: createId(),
            // 1x1 transparent PNG.
            dataUrl:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            altText: 'The resume builder side panel next to a job posting.',
          },
        ],
      },
    ],
    portfolio: {
      bio: 'Full-stack engineer who builds tools that make job hunting less painful.',
      featuredProjectIds: [projectId],
      recommendations: [
        {
          id: createId(),
          authorName: 'Jordan Rivera',
          authorTitle: 'Engineering Manager',
          authorCompany: 'Acme Corp',
          relationship: 'manager',
          quote:
            'Delivered the billing migration two weeks early and documented every step.',
          sourceUrl: 'https://www.linkedin.com/in/example-recommendation',
          hasAuthorPermission: true,
        },
      ],
    },
  };
}
