export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceXaf: number;
  pvPoints: number;
  category: "health" | "beauty" | "agriculture";
  image: string;
  isBestseller?: boolean;
}

export interface DistributorNode {
  id: string;
  name: string;
  distributorCode: string;
  rank: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  pv: number;
  joinedAt: string;
  sponsorId: string | null;
  placementId: string | null;
  leftId?: string | null;
  rightId?: string | null;
}

export interface WalletTransaction {
  id: string;
  type: "commission" | "withdrawal" | "deposit" | "refund";
  amountXaf: number;
  description: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
}

export interface SpecChapter {
  id: string;
  title: string;
  content: string;
  codeSnippet?: string;
  codeLanguage?: string;
}

export interface SchemaTable {
  name: string;
  description: string;
  columns: {
    name: string;
    type: string;
    constraints: string[];
    description: string;
  }[];
}
