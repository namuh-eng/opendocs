import { getPublicDocsLlmsResponse } from "@/lib/public-docs-llms";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;
  return getPublicDocsLlmsResponse(request, subdomain, "index");
}
