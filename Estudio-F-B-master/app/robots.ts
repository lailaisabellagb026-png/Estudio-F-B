import type { MetadataRoute } from "next";

// O painel não tem senha, então pede ao Google para não listar /admin.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
  };
}
