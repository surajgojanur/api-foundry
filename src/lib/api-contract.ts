import type { ApiContract, ApiFieldDefinition, CompetitorProject, DataBlockType } from "@/lib/types";

function field(
  type: ApiFieldDefinition["type"],
  description: string,
  example?: ApiFieldDefinition["example"],
): ApiFieldDefinition {
  return { type, description, example };
}

const blockSchema: Record<DataBlockType, Record<string, ApiFieldDefinition>> = {
  products: {
    id: field("string", "Stable item identifier", "bl-p1"),
    title: field("string", "Human-readable product title", "Apple 1kg - in_stock"),
    name: field("string", "Product name", "Apple 1kg"),
    category: field("string", "Product category", "fruits"),
    price: field("number", "Current displayed price", 99),
    oldPrice: field("number", "Previous listed price", 120),
    currency: field("string", "Currency code", "INR"),
    availability: field("string", "Current availability state", "in_stock"),
  },
  prices: {
    id: field("string", "Price row id", "zp-pr-1"),
    name: field("string", "Item name", "Whole Wheat Bread"),
    price: field("number", "Current price", 39),
    oldPrice: field("number", "Previous price", 45),
    currency: field("string", "Currency code", "INR"),
  },
  offers: {
    id: field("string", "Offer identifier", "zp-o3"),
    title: field("string", "Offer title", "Banana Bonanza"),
    description: field("string", "Offer detail text", "Buy 2 get 1 on fresh bananas"),
  },
  availability: {
    id: field("string", "Availability row id", "zp-a3"),
    title: field("string", "Entity title", "Toned Milk 1L"),
    availability: field("string", "Stock status", "out_of_stock"),
  },
  announcements: {
    id: field("string", "Announcement id", "bl-an2"),
    title: field("string", "Announcement headline", "New delivery location: HSR Layout"),
    description: field("string", "Announcement details", "Blinkit now serves HSR Layout with express slots."),
  },
  jobs: {
    id: field("string", "Job post id", "job-1001"),
    title: field("string", "Job title", "Category Manager - Grocery"),
    location: field("string", "Role location", "Bengaluru"),
  },
  blog: {
    id: field("string", "Blog post id", "blog-500"),
    title: field("string", "Blog title", "How we optimized fast delivery"),
    description: field("string", "Article summary", "Operations and fulfillment improvements."),
  },
  locations: {
    id: field("string", "Location id", "loc-hsr"),
    title: field("string", "Service area label", "HSR Layout"),
    location: field("string", "Geo location name", "Bengaluru"),
  },
};

export function buildSchemaForBlocks(blocks: DataBlockType[]) {
  return blocks.reduce<Record<string, Record<string, ApiFieldDefinition>>>((acc, block) => {
    acc[block] = blockSchema[block];
    return acc;
  }, {});
}

export function buildFeedResponse(project: CompetitorProject) {
  return {
    projectId: project.id,
    projectName: project.name,
    source: project.companyUrl,
    status: project.status,
    lastUpdated: project.lastUpdated,
    selectedBlocks: project.selectedBlocks,
    sourceUrls: project.discoveredUrls,
    schema: buildSchemaForBlocks(project.selectedBlocks),
    data: project.currentSnapshot.data,
  };
}

export function buildApiContract(project: CompetitorProject): ApiContract {
  return {
    endpoint: project.endpoint,
    method: "GET",
    description: `Generated feed endpoint for ${project.name} competitor intelligence data blocks.`,
    schema: {
      projectId: field("string", "Unique project identifier", project.id),
      projectName: field("string", "Project display name", project.name),
      source: field("string", "Tracked competitor website", project.companyUrl),
      status: field("string", "Current project scan status", project.status),
      lastUpdated: field("datetime", "Last feed refresh timestamp", project.lastUpdated),
      selectedBlocks: field("array", "Selected data blocks included in this feed"),
      sourceUrls: field("array", "Discovered competitor URLs used for extraction"),
      data: field("object", "Data grouped by selected blocks"),
      blockSchemas: field("object", "Per-block field definitions for selected data blocks"),
    },
    exampleResponse: buildFeedResponse(project),
  };
}
