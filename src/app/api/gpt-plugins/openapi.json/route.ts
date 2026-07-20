import { jsonResponse } from "../_shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return jsonResponse({
    components: {
      securitySchemes: {
        bearerAuth: {
          scheme: "bearer",
          type: "http",
        },
      },
    },
    info: {
      description:
        "Read-only Sovia content and YouTube analytics data for private GPT analysis.",
      title: "Sovia GPT Plugins API",
      version: "0.1.0",
    },
    openapi: "3.1.0",
    paths: {
      "/api/gpt-plugins/analytics/compare": {
        get: {
          operationId: "compareSoviaAnalytics",
          responses: {
            "200": { description: "Comparison groups for Sovia works." },
          },
          security: [{ bearerAuth: [] }],
          summary: "Compare Sovia works by diagnosis group",
        },
      },
      "/api/gpt-plugins/analytics/overview": {
        get: {
          operationId: "getSoviaAnalyticsOverview",
          responses: {
            "200": { description: "Overview analytics and top works." },
          },
          security: [{ bearerAuth: [] }],
          summary: "Get Sovia analytics overview",
        },
      },
      "/api/gpt-plugins/analytics/works": {
        get: {
          operationId: "listSoviaAnalyticsWorks",
          parameters: [
            {
              in: "query",
              name: "limit",
              schema: {
                default: 50,
                maximum: 100,
                minimum: 1,
                type: "integer",
              },
            },
            {
              in: "query",
              name: "offset",
              schema: { default: 0, minimum: 0, type: "integer" },
            },
          ],
          responses: {
            "200": { description: "Paginated Sovia works with analytics." },
          },
          security: [{ bearerAuth: [] }],
          summary: "List Sovia works with content and analytics",
        },
      },
      "/api/gpt-plugins/analytics/works/{id}": {
        get: {
          operationId: "getSoviaAnalyticsWork",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Sovia work content and analytics." },
            "404": { description: "Work not found." },
          },
          security: [{ bearerAuth: [] }],
          summary: "Get one Sovia work by content id, path, or YouTube id",
        },
      },
    },
    servers: [{ url: origin }],
  });
}
