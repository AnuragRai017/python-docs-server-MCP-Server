#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'python-docs-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

const isValidGetPythonDocsArgs = (args: any): args is { query: string } =>
  typeof args === 'object' && args !== null && typeof args.query === 'string';

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_python_docs',
      description: 'Get Python documentation for a given query',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query for Python documentation',
          },
        },
        required: ['query'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'get_python_docs') {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
  }

  if (!isValidGetPythonDocsArgs(request.params.arguments)) {
    throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments');
  }

  const query = request.params.arguments.query;

  try {
    const searchResult = await (server as any).callMcpTool({
        serverName: 'brave-search',
        toolName: 'search_web',
        arguments: {
          query: `python documentation ${query}`,
          count: 3,
        },
      });

    if (searchResult.isError) {
        return {
            content: [{
                type: 'text',
                text: `Error searching for documentation: ${searchResult.content[0].text}`
            }],
            isError: true,
        }
    }

    const results = searchResult.content[0].text;

    return {
      content: [
        {
          type: 'text',
          text: `Search results for "${query}":\n${results}`,
        },
      ],
    };
  } catch (error: any) {
    return {
        content: [{
            type: 'text',
            text: `Error: ${error.message}`
        }],
        isError: true,
    }
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Python docs MCP server running on stdio');
}

main().catch(console.error);
