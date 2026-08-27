import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CarbonLoop",
    short_name: "CarbonLoop",
    description: "Evidence-backed campus decarbonization platform",
    display: "standalone",
    start_url: "/",
  };
}
