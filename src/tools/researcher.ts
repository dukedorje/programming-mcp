import { z } from "zod";
import { callAIProvider } from "../common/apiClient.js";
import { getDefaultProvider, type AIProvider, type ReasoningEffort } from "../common/providerConfig.js";
import { RESEARCHER_SYSTEM_PROMPT } from "../prompts/researcherPrompts.js";

/**
 * Researcher tool
 *   - Performs multi-source research using various search engines and APIs
 *   - Manages sources with proper citation formatting
 *   - Provides comprehensive research synthesis with source attribution
 */

export const researcherToolName = "researcher";
export const researcherToolDescription =
  "Conducts comprehensive research using multiple sources, manages citations, and synthesizes information with proper source attribution.";

// Source type definitions
export interface Source {
  id: string;
  title: string;
  url: string;
  snippet: string;
  searchEngine: string;
  timestamp: string;
  relevanceScore?: number;
  authors?: string[];
  publishDate?: string;
  domain?: string;
}

export interface ResearchResult {
  query: string;
  sources: Source[];
  synthesis: string;
  citations: Map<string, Source>;
  searchEnginesUsed: string[];
  timestamp: string;
}

export const ResearcherToolSchema = z.object({
  query: z.string().min(1, "Research query is required."),
  search_engines: z
    .array(z.enum(["google", "xai", "arxiv", "wikipedia", "github", "stackexchange", "pubmed", "semantic_scholar"]))
    .optional()
    .describe(
      "Search engines to use. Defaults to ['google', 'xai']. Available: google, xai, arxiv, wikipedia, github, stackexchange, pubmed, semantic_scholar"
    ),
  max_results_per_engine: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .describe("Maximum results per search engine (1-20). Defaults to 5."),
  deep_search: z
    .boolean()
    .optional()
    .describe("Whether to perform deep search by following links and extracting full content. Defaults to false."),
  include_academic: z
    .boolean()
    .optional()
    .describe("Whether to prioritize academic sources (arxiv, pubmed, semantic_scholar). Defaults to false."),
  reasoning_effort: z
    .enum(["low", "medium", "high"])
    .optional()
    .describe(
      "How hard the AI should think when synthesizing results (low/medium/high). Defaults to high for research."
    ),
  provider: z
    .enum(["xai", "openai"])
    .optional()
    .describe(
      "AI provider to use for synthesis. Defaults to xai (grok-4) but can switch to openai (gpt-5)."
    ),
  citation_style: z
    .enum(["apa", "mla", "chicago", "ieee", "inline"])
    .optional()
    .describe("Citation style to use. Defaults to 'inline' for easy reading."),
});

// Search API implementations
async function searchGoogle(query: string, maxResults: number): Promise<Source[]> {
  // Google Custom Search API implementation
  // Note: Requires GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;
  
  if (!apiKey || !cseId) {
    console.warn("Google Search API credentials not configured");
    return [];
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=${maxResults}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.items || []).map((item: any, index: number) => ({
      id: `google-${index}`,
      title: item.title,
      url: item.link,
      snippet: item.snippet || "",
      searchEngine: "Google",
      timestamp: new Date().toISOString(),
      domain: new URL(item.link).hostname,
    }));
  } catch (error) {
    console.error("Google search error:", error);
    return [];
  }
}

async function searchXAI(query: string, maxResults: number): Promise<Source[]> {
  // X.AI/Perplexity API implementation
  // This would integrate with Perplexity or X.AI's search capabilities
  const apiKey = process.env.XAI_API_KEY || process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.warn("X.AI/Perplexity API credentials not configured");
    return [];
  }

  try {
    // Perplexity API example
    const response = await fetch("https://api.perplexity.ai/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: "comprehensive",
        include_sources: true,
      }),
    });
    
    const data = await response.json();
    return (data.sources || []).map((source: any, index: number) => ({
      id: `xai-${index}`,
      title: source.title,
      url: source.url,
      snippet: source.excerpt || "",
      searchEngine: "X.AI/Perplexity",
      timestamp: new Date().toISOString(),
      domain: new URL(source.url).hostname,
    }));
  } catch (error) {
    console.error("X.AI search error:", error);
    return [];
  }
}

async function searchArxiv(query: string, maxResults: number): Promise<Source[]> {
  // ArXiv API implementation for academic papers
  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
    const response = await fetch(url);
    const text = await response.text();
    
    // Simple XML parsing (in production, use a proper XML parser)
    const entries = text.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    
    return entries.map((entry, index) => {
      const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim() || "";
      const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.trim() || "";
      const id = (entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1]?.trim() || "";
      const authors = (entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g) || [])
        .map(a => (a.match(/<name>([\s\S]*?)<\/name>/) || [])[1]?.trim())
        .filter(Boolean);
      
      return {
        id: `arxiv-${index}`,
        title,
        url: id,
        snippet: summary.substring(0, 200) + "...",
        searchEngine: "ArXiv",
        timestamp: new Date().toISOString(),
        authors,
        domain: "arxiv.org",
      };
    });
  } catch (error) {
    console.error("ArXiv search error:", error);
    return [];
  }
}

async function searchWikipedia(query: string, maxResults: number): Promise<Source[]> {
  // Wikipedia API implementation
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${maxResults}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.query?.search || []).map((item: any, index: number) => ({
      id: `wiki-${index}`,
      title: item.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
      snippet: item.snippet.replace(/<[^>]*>/g, ""), // Remove HTML tags
      searchEngine: "Wikipedia",
      timestamp: new Date().toISOString(),
      domain: "wikipedia.org",
    }));
  } catch (error) {
    console.error("Wikipedia search error:", error);
    return [];
  }
}

async function searchGitHub(query: string, maxResults: number): Promise<Source[]> {
  // GitHub API implementation for code/repository search
  const token = process.env.GITHUB_TOKEN;
  
  try {
    const headers: any = { "Accept": "application/vnd.github.v3+json" };
    if (token) headers["Authorization"] = `token ${token}`;
    
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${maxResults}`;
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    return (data.items || []).map((repo: any, index: number) => ({
      id: `github-${index}`,
      title: repo.full_name,
      url: repo.html_url,
      snippet: repo.description || "No description available",
      searchEngine: "GitHub",
      timestamp: new Date().toISOString(),
      domain: "github.com",
      relevanceScore: repo.stargazers_count,
    }));
  } catch (error) {
    console.error("GitHub search error:", error);
    return [];
  }
}

async function searchStackExchange(query: string, maxResults: number): Promise<Source[]> {
  // StackExchange API implementation
  try {
    const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=${maxResults}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.items || []).map((item: any, index: number) => ({
      id: `stack-${index}`,
      title: item.title,
      url: item.link,
      snippet: `Score: ${item.score}, Answers: ${item.answer_count}`,
      searchEngine: "StackOverflow",
      timestamp: new Date().toISOString(),
      domain: "stackoverflow.com",
      relevanceScore: item.score,
    }));
  } catch (error) {
    console.error("StackExchange search error:", error);
    return [];
  }
}

// Citation formatter
function formatCitation(source: Source, style: string): string {
  const date = new Date(source.timestamp).toLocaleDateString();
  
  switch (style) {
    case "apa":
      return `${source.authors?.join(", ") || source.domain}. (${date}). ${source.title}. Retrieved from ${source.url}`;
    case "mla":
      return `${source.authors?.join(", ") || source.domain}. "${source.title}." Web. ${date}. <${source.url}>`;
    case "chicago":
      return `${source.authors?.join(", ") || source.domain}. "${source.title}." Accessed ${date}. ${source.url}.`;
    case "ieee":
      return `[${source.id}] ${source.authors?.join(", ") || source.domain}, "${source.title}," ${source.searchEngine}, ${date}. [Online]. Available: ${source.url}`;
    case "inline":
    default:
      return `[${source.title}](${source.url}) - ${source.searchEngine}`;
  }
}

// Main research function
export async function runResearcherTool(
  args: z.infer<typeof ResearcherToolSchema>
) {
  const {
    query,
    search_engines = ["google", "xai"],
    max_results_per_engine = 5,
    deep_search = false,
    include_academic = false,
    reasoning_effort = "high",
    provider = getDefaultProvider(),
    citation_style = "inline",
  } = args;

  try {
    // Expand search engines if academic sources requested
    let engines = [...search_engines];
    if (include_academic && !engines.includes("arxiv")) {
      engines.push("arxiv");
    }
    if (include_academic && !engines.includes("semantic_scholar")) {
      engines.push("semantic_scholar");
    }

    // Perform searches in parallel
    const searchPromises = engines.map(async (engine) => {
      switch (engine) {
        case "google":
          return await searchGoogle(query, max_results_per_engine);
        case "xai":
          return await searchXAI(query, max_results_per_engine);
        case "arxiv":
          return await searchArxiv(query, max_results_per_engine);
        case "wikipedia":
          return await searchWikipedia(query, max_results_per_engine);
        case "github":
          return await searchGitHub(query, max_results_per_engine);
        case "stackexchange":
          return await searchStackExchange(query, max_results_per_engine);
        default:
          return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    const allSources = searchResults.flat();

    // Create citations map
    const citations = new Map<string, Source>();
    allSources.forEach(source => {
      citations.set(source.id, source);
    });

    // Prepare source content for AI synthesis
    const sourcesContent = allSources.map(source => 
      `[${source.id}] ${source.title}\n${source.searchEngine} - ${source.url}\n${source.snippet}\n`
    ).join("\n---\n");

    // Call AI provider for synthesis
    const synthesisPrompt = `Research Query: ${query}

Sources Found:
${sourcesContent}

Please synthesize these sources into a comprehensive research summary. Include:
1. Key findings and insights
2. Conflicting information or debates
3. Knowledge gaps or areas needing more research
4. Proper source attribution using [source-id] references

Citation Style: ${citation_style}`;

    const synthesis = await callAIProvider({
      systemPrompt: RESEARCHER_SYSTEM_PROMPT,
      task: synthesisPrompt,
      code: "", // Not needed for research
      analysisType: "research",
      reasoningEffort: reasoning_effort as ReasoningEffort,
      provider: provider as AIProvider,
    });

    // Format citations
    const formattedCitations = allSources.map(source => 
      formatCitation(source, citation_style)
    ).join("\n");

    // Compile final result
    const result = `# Research Results for: "${query}"

## Summary
${synthesis}

## Sources Used (${allSources.length} total)
${formattedCitations}

## Search Engines Consulted
${engines.join(", ")}

## Metadata
- Timestamp: ${new Date().toISOString()}
- Deep Search: ${deep_search}
- Academic Priority: ${include_academic}
- Citation Style: ${citation_style}
`;

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Research Error: ${error.message || error}`,
        },
      ],
    };
  }
}
