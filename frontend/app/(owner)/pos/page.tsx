import { apiFetch, ApiError } from "@/lib/api";
import type { PageResponse, ProductResponse } from "@/lib/types";
import { ErrorAlert } from "@/components/ui";
import PosScreen from "./PosScreen";

// GET /products is paginated (see ProductController), but PosScreen wants
// the whole catalog at once for its client-side instant search — asking for
// a large page size gets that in one call without needing a second,
// unpaginated endpoint. See ProductController#list's comment for the
// tradeoff this implies at very large catalog sizes.
const POS_CATALOG_SIZE = 1000;

export default async function PosPage() {
  let products: ProductResponse[];
  let loadError: string | null = null;

  try {
    const result = await apiFetch<PageResponse<ProductResponse>>(`/products?size=${POS_CATALOG_SIZE}`);
    products = result.content;
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load products";
    products = [];
  }

  if (loadError) {
    return <ErrorAlert>{loadError}</ErrorAlert>;
  }

  return <PosScreen initialProducts={products} />;
}
