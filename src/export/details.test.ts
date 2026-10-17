import { describe, expect, it } from 'vitest';

import {
  createBlankCertificationEntry,
  createBlankProjectEntry,
} from '../resume';
import {
  certificationExtras,
  projectExtras,
  resolveExportDetails,
  validateExportDetails,
} from './details';

const ALL_BELOW = resolveExportDetails({
  projectLinks: 'below',
  projectTechStack: 'below',
  projectOutcome: 'below',
  credentialUrl: 'below',
});

const ALL_HEADING = resolveExportDetails({
  projectLinks: 'heading',
  projectTechStack: 'heading',
  credentialUrl: 'heading',
});

function project(): ReturnType<typeof createBlankProjectEntry> {
  return {
    ...createBlankProjectEntry(),
    name: 'Ledger',
    url: 'https://ledger.example.com',
    repoUrl: 'https://github.com/example/ledger',
    demoUrl: 'https://demo.example.com',
    techStack: ['Go', ' PostgreSQL ', ''],
    outcome: 'Cut reconciliation from 2 days to 2 hours.',
  };
}

describe('resolveExportDetails', () => {
  it('prints nothing by default', () => {
    expect(resolveExportDetails(undefined)).toEqual({
      projectLinks: 'off',
      projectTechStack: 'off',
      projectOutcome: 'off',
      credentialUrl: 'off',
    });
  });

  it('keeps the options that are given and defaults the rest', () => {
    expect(resolveExportDetails({ projectLinks: 'heading' })).toMatchObject({
      projectLinks: 'heading',
      projectTechStack: 'off',
    });
  });

  it('rejects an unknown placement, naming the option and the allowed values', () => {
    expect(() =>
      resolveExportDetails({ projectLinks: 'beside' as never })
    ).toThrow(/projectLinks must be one of off, heading, below.*beside/);
  });

  it('only lets outcomes go below', () => {
    const issues = validateExportDetails({
      projectOutcome: 'heading' as never,
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toEqual(['projectOutcome']);
    expect(issues[0]?.message).toContain('off, below');
  });

  it('reports every invalid option at once', () => {
    expect(
      validateExportDetails({
        projectLinks: 'x' as never,
        credentialUrl: 'y' as never,
      })
    ).toHaveLength(2);
  });
});

describe('projectExtras', () => {
  it('returns nothing when everything is off', () => {
    expect(projectExtras(project(), resolveExportDetails(undefined))).toEqual({
      headingParts: [],
      belowLines: [],
    });
  });

  it('puts labelled lines below, in outcome, tech stack, links order', () => {
    expect(projectExtras(project(), ALL_BELOW).belowLines).toEqual([
      'Outcome: Cut reconciliation from 2 days to 2 hours.',
      'Tech stack: Go, PostgreSQL',
      'Link: https://ledger.example.com | Code: https://github.com/example/ledger | Demo: https://demo.example.com',
    ]);
  });

  it('puts unlabelled tech stack and links on the heading', () => {
    expect(projectExtras(project(), ALL_HEADING)).toEqual({
      headingParts: [
        'Go, PostgreSQL',
        'https://ledger.example.com | https://github.com/example/ledger | https://demo.example.com',
      ],
      belowLines: [],
    });
  });

  it('shows a link that appears in two fields only once', () => {
    const entry = { ...project(), repoUrl: 'https://ledger.example.com' };

    expect(projectExtras(entry, ALL_BELOW).belowLines).toContain(
      'Link: https://ledger.example.com | Demo: https://demo.example.com'
    );
  });

  it('skips details the project does not have', () => {
    const entry = {
      ...createBlankProjectEntry(),
      name: 'Bare',
      techStack: [],
    };

    expect(projectExtras(entry, ALL_BELOW)).toEqual({
      headingParts: [],
      belowLines: [],
    });
  });

  it('can mix placements', () => {
    const extras = projectExtras(
      project(),
      resolveExportDetails({
        projectTechStack: 'heading',
        projectLinks: 'below',
      })
    );

    expect(extras.headingParts).toEqual(['Go, PostgreSQL']);
    expect(extras.belowLines).toHaveLength(1);
  });
});

describe('certificationExtras', () => {
  const certification = {
    ...createBlankCertificationEntry(),
    name: 'CKA',
    credentialUrl: 'https://verify.example.com/abc',
  };

  it('adds the credential URL to the heading or below it', () => {
    expect(certificationExtras(certification, ALL_HEADING)).toEqual({
      headingParts: ['https://verify.example.com/abc'],
      belowLines: [],
    });
    expect(certificationExtras(certification, ALL_BELOW)).toEqual({
      headingParts: [],
      belowLines: ['Credential: https://verify.example.com/abc'],
    });
  });

  it('adds nothing when off or when there is no URL', () => {
    const none = { headingParts: [], belowLines: [] };

    expect(
      certificationExtras(certification, resolveExportDetails(undefined))
    ).toEqual(none);
    expect(
      certificationExtras(
        { ...certification, credentialUrl: undefined },
        ALL_BELOW
      )
    ).toEqual(none);
  });
});
