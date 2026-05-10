import type { CreateProjectInput } from "@/lib/types";

export const LIVE_TRACKING_TARGETS: CreateProjectInput[] = [
  {
    projectId: "live-zepto",
    name: "Live Zepto",
    companyUrl: "https://www.zepto.com/",
    useCase: "competitor intelligence",
    country: "in",
    selectedBlocks: ["products", "offers", "availability", "announcements"],
  },
  {
    projectId: "live-blinkit",
    name: "Live Blinkit",
    companyUrl: "https://blinkit.com/",
    useCase: "competitor intelligence",
    country: "in",
    selectedBlocks: ["products", "offers", "availability", "announcements"],
  },
];

export function getLiveTrackingTargets() {
  return LIVE_TRACKING_TARGETS;
}

export function getLiveTarget(id: string) {
  return LIVE_TRACKING_TARGETS.find((target) => target.projectId === id);
}
