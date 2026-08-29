import { completeRun } from "@/lib/demo-api";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return completeRun(request, (await context.params).id);
}
