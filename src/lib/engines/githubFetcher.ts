/**
 * PR-XRay: Direct In-Browser GitHub Stream Ingestion Engine
 * Zero-Cloud Client-Side GitHub API & Raw Diff Protocol Driver
 * Supports both Public & Private Repositories via In-Memory PAT
 */

export interface GitHubTargetMeta {
  owner: string;
  repo: string;
  pullNumber?: number;
  commitSha?: string;
  isPullRequest: boolean;
  rawInput: string;
}

export interface GitHubFetchResponse {
  target: GitHubTargetMeta;
  title: string;
  author: string;
  authorAvatar: string;
  baseBranch: string;
  headBranch: string;
  rawDiff: string;
  rateLimit: {
    limit: number;
    remaining: number;
    resetTimestamp: number;
  };
}

export interface GitHubApiError {
  status: number;
  message: string;
  isPrivateRepoProbable: boolean;
  rateLimitReset?: Date;
}

/**
 * Parses user input strings into structured GitHub target metadata.
 * Supports:
 * - https://github.com/owner/repo/pull/123
 * - https://github.com/owner/repo
 * - owner/repo#123
 * - owner/repo
 */
export function parseGitHubTarget(input: string): GitHubTargetMeta {
  const clean = input.trim();

  // Pattern 1: Full PR URL (e.g., https://github.com/facebook/react/pull/31750)
  const prUrlMatch = clean.match(/^https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)/i);
  if (prUrlMatch) {
    return {
      owner: prUrlMatch[1],
      repo: prUrlMatch[2],
      pullNumber: parseInt(prUrlMatch[3], 10),
      isPullRequest: true,
      rawInput: clean,
    };
  }

  // Pattern 2: Short PR shorthand (e.g., facebook/react#31750)
  const prShortMatch = clean.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#(\d+)$/);
  if (prShortMatch) {
    return {
      owner: prShortMatch[1],
      repo: prShortMatch[2],
      pullNumber: parseInt(prShortMatch[3], 10),
      isPullRequest: true,
      rawInput: clean,
    };
  }

  // Pattern 3: Full Repo URL (e.g., https://github.com/facebook/react)
  const repoUrlMatch = clean.match(/^https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/.*)?$/i);
  if (repoUrlMatch) {
    return {
      owner: repoUrlMatch[1],
      repo: repoUrlMatch[2].replace(/\.git$/, ''),
      isPullRequest: false,
      rawInput: clean,
    };
  }

  // Pattern 4: Bare owner/repo shorthand (e.g., AkshatRaj00/ws-msc)
  const repoShortMatch = clean.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (repoShortMatch) {
    return {
      owner: repoShortMatch[1],
      repo: repoShortMatch[2],
      isPullRequest: false,
      rawInput: clean,
    };
  }

  throw new Error(`Invalid GitHub repository or Pull Request format: "${clean}"`);
}

/**
 * Builds HTTP headers dynamically. If a PAT is supplied, it provides
 * access to private repositories and unlocks GitHub's 5,000 req/hr tier.
 */
function buildHeaders(token?: string | null, isDiff: boolean = false): HeadersInit {
  const headers: Record<string, string> = {
    'Accept': isDiff ? 'application/vnd.github.v3.diff' : 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (token && token.trim().length > 0) {
    // Sanitized token injection (Bearer or token prefix)
    const cleanToken = token.trim();
    headers['Authorization'] = cleanToken.startsWith('Bearer ') || cleanToken.startsWith('token ')
      ? cleanToken
      : `Bearer ${cleanToken}`;
  }

  return headers;
}

/**
 * Extracts rate-limiting headers from the GitHub API response.
 */
function extractRateLimits(res: Response) {
  const limit = parseInt(res.headers.get('x-ratelimit-limit') || '60', 10);
  const remaining = parseInt(res.headers.get('x-ratelimit-remaining') || '0', 10);
  const resetEpoch = parseInt(res.headers.get('x-ratelimit-reset') || '0', 10);

  return {
    limit,
    remaining,
    resetTimestamp: resetEpoch * 1000,
  };
}

/**
 * Fetches PR or Repo Diff data natively in the client browser.
 */
export async function fetchGitHubDiff(
  targetInput: string,
  token?: string | null
): Promise<GitHubFetchResponse> {
  const meta = parseGitHubTarget(targetInput);

  // If the target is a specific Pull Request:
  if (meta.isPullRequest && meta.pullNumber) {
    const apiUrl = `https://api.github.com/repos/${meta.owner}/${meta.repo}/pulls/${meta.pullNumber}`;

    // 1. Fetch Pull Request JSON Metadata
    const metaRes = await fetch(apiUrl, {
      method: 'GET',
      headers: buildHeaders(token, false),
      cache: 'no-store',
    });

    const rateLimits = extractRateLimits(metaRes);

    if (!metaRes.ok) {
      if (metaRes.status === 404) {
        throw {
          status: 404,
          message: token
            ? `Pull Request ${meta.owner}/${meta.repo}#${meta.pullNumber} not found. Verify repository permissions.`
            : `Repository or PR not found. If this is a PRIVATE repository, configure a GitHub Personal Access Token (PAT).`,
          isPrivateRepoProbable: !token,
        } as GitHubApiError;
      }

      if (metaRes.status === 403 || metaRes.status === 429) {
        throw {
          status: metaRes.status,
          message: `GitHub API rate limit exhausted (${rateLimits.remaining}/${rateLimits.limit}). Provide a PAT to unlock 5,000 requests/hour.`,
          isPrivateRepoProbable: false,
          rateLimitReset: new Date(rateLimits.resetTimestamp),
        } as GitHubApiError;
      }

      const errJson = await metaRes.json().catch(() => ({}));
      throw {
        status: metaRes.status,
        message: errJson.message || `GitHub API error: ${metaRes.statusText}`,
        isPrivateRepoProbable: false,
      } as GitHubApiError;
    }

    const prData = await metaRes.json();

    // 2. Fetch Raw Unified Diff Stream (.diff)
    const diffRes = await fetch(apiUrl, {
      method: 'GET',
      headers: buildHeaders(token, true),
      cache: 'no-store',
    });

    if (!diffRes.ok) {
      throw {
        status: diffRes.status,
        message: `Failed to stream PR unified diff (${diffRes.statusText}).`,
        isPrivateRepoProbable: false,
      } as GitHubApiError;
    }

    const rawDiff = await diffRes.text();

    return {
      target: meta,
      title: prData.title || `PR #${meta.pullNumber}`,
      author: prData.user?.login || 'unknown',
      authorAvatar: prData.user?.avatar_url || '',
      baseBranch: prData.base?.ref || 'main',
      headBranch: prData.head?.ref || 'feature',
      rawDiff,
      rateLimit: rateLimits,
    };
  }

  // If the target is a bare Repository (fetches latest commit comparison diff):
  const repoUrl = `https://api.github.com/repos/${meta.owner}/${meta.repo}`;
  const repoRes = await fetch(repoUrl, {
    method: 'GET',
    headers: buildHeaders(token, false),
    cache: 'no-store',
  });

  const rateLimits = extractRateLimits(repoRes);

  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw {
        status: 404,
        message: token
          ? `Repository ${meta.owner}/${meta.repo} not found.`
          : `Repository not found. If "${meta.owner}/${meta.repo}" is PRIVATE, provide a GitHub PAT.`,
        isPrivateRepoProbable: !token,
      } as GitHubApiError;
    }

    const errJson = await repoRes.json().catch(() => ({}));
    throw {
      status: repoRes.status,
      message: errJson.message || `GitHub API error: ${repoRes.statusText}`,
      isPrivateRepoProbable: false,
    } as GitHubApiError;
  }

  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch || 'main';

  // Fetch comparison diff for default branch head commit
  const commitDiffUrl = `https://api.github.com/repos/${meta.owner}/${meta.repo}/commits/${defaultBranch}`;
  const commitDiffRes = await fetch(commitDiffUrl, {
    method: 'GET',
    headers: buildHeaders(token, true),
    cache: 'no-store',
  });

  const rawDiff = commitDiffRes.ok ? await commitDiffRes.text() : '';

  return {
    target: meta,
    title: repoData.description || `${meta.owner}/${meta.repo} [Default Branch: ${defaultBranch}]`,
    author: repoData.owner?.login || meta.owner,
    authorAvatar: repoData.owner?.avatar_url || '',
    baseBranch: defaultBranch,
    headBranch: defaultBranch,
    rawDiff,
    rateLimit: rateLimits,
  };
}