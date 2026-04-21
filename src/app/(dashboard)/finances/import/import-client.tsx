"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { processImportAction } from "./actions";
import type { FinancialAccount, FinancialCategory } from "@/db/schema";

type Props = {
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
};

type ColumnMapping = {
  date: string;
  description: string;
  amount: string;
  type: string;
  merchant: string;
};

const REQUIRED_FIELDS = ["date", "description", "amount"] as const;
const OPTIONAL_FIELDS = ["type", "merchant"] as const;
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;

const FIELD_LABELS: Record<string, string> = {
  date: "Date",
  description: "Description",
  amount: "Amount",
  type: "Type (income/expense)",
  merchant: "Merchant",
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function guessMapping(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (keywords: string[]): string => {
    for (const kw of keywords) {
      const idx = lower.findIndex((h) => h.includes(kw));
      if (idx !== -1) return headers[idx];
    }
    return "";
  };
  return {
    date: find(["date", "posted", "transaction date"]),
    description: find(["description", "memo", "note", "detail", "name"]),
    amount: find(["amount", "total", "sum", "value"]),
    type: find(["type", "category", "kind"]),
    merchant: find(["merchant", "payee", "vendor"]),
  };
}

export function ImportClient({ accounts, categories: _categories }: Props) {
  const [accountId, setAccountId] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "",
    description: "",
    amount: "",
    type: "",
    merchant: "",
  });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(guessMapping(parsed.headers));
    };
    reader.readAsText(file);
  };

  const mappedTransactions = rows.map((row) => {
    const get = (field: string) => {
      const idx = headers.indexOf(field);
      return idx !== -1 ? row[idx] : "";
    };

    const rawAmount = get(mapping.amount);
    const amount = parseFloat(rawAmount.replace(/[$,]/g, "")) || 0;
    const typeRaw = mapping.type ? get(mapping.type).toLowerCase() : "";
    const type: "income" | "expense" =
      typeRaw === "income" || typeRaw === "credit" ? "income" : "expense";

    return {
      date: get(mapping.date),
      description: get(mapping.description),
      amount: Math.abs(amount),
      type: amount > 0 && !mapping.type ? "income" as const : amount < 0 && !mapping.type ? "expense" as const : type,
      merchant: mapping.merchant ? get(mapping.merchant) : undefined,
    };
  });

  const canImport =
    accountId &&
    mapping.date &&
    mapping.description &&
    mapping.amount &&
    rows.length > 0;

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.set("accountId", accountId);
    formData.set("transactions", JSON.stringify(mappedTransactions));

    const res = await processImportAction(formData);
    setImporting(false);

    if (res.success) {
      setResult({ imported: res.imported, skipped: res.skipped });
    } else {
      setError(res.error ?? "Import failed");
    }
  };

  const previewRows = mappedTransactions.slice(0, 5);

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/finances"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Import</h1>
          <p className="text-sm text-muted-foreground">
            Import transactions from CSV files or connect your pipeline
          </p>
        </div>
      </div>

      {/* CSV Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            CSV Import
          </CardTitle>
          <CardDescription>
            Upload a CSV file and map its columns to transaction fields
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Select Account */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              1. Select an account to import into
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acct) => (
                  <SelectItem key={acct.id} value={acct.id}>
                    {acct.name} ({acct.accountType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accounts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No accounts found.{" "}
                <Link href="/finances/accounts" className="underline">
                  Create one first
                </Link>
                .
              </p>
            )}
          </div>

          {/* Step 2: Upload CSV */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">2. Upload a CSV file</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {/* Step 3: Column Mapping */}
          {headers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                3. Map columns to transaction fields
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {ALL_FIELDS.map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {FIELD_LABELS[field]}
                      {REQUIRED_FIELDS.includes(field as typeof REQUIRED_FIELDS[number]) && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    <Select
                      value={mapping[field]}
                      onValueChange={(val) =>
                        setMapping((prev) => ({ ...prev, [field]: val }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {!mapping.type && (
                <p className="text-xs text-muted-foreground">
                  No type column mapped. Positive amounts will be treated as income, negative as
                  expenses.
                </p>
              )}
            </div>
          )}

          {/* Preview */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Preview ({Math.min(5, rows.length)} of {rows.length} rows)
              </Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    {mapping.merchant && <TableHead>Merchant</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((tx, i) => (
                    <TableRow key={i}>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell>${tx.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === "income" ? "default" : "secondary"}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      {mapping.merchant && <TableCell>{tx.merchant}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Import Button & Results */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleImport}
              disabled={!canImport || importing}
            >
              <Upload className="size-4 mr-2" />
              {importing ? "Importing..." : "Import"}
            </Button>

            {result && (
              <p className="text-sm text-muted-foreground">
                Imported{" "}
                <span className="font-semibold text-foreground">{result.imported}</span>{" "}
                transactions
                {result.skipped > 0 && (
                  <>, skipped{" "}
                    <span className="font-semibold text-foreground">{result.skipped}</span>{" "}
                    duplicates
                  </>
                )}
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </CardContent>
      </Card>

      {/* API Endpoint Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="size-5" />
            API Endpoint
          </CardTitle>
          <CardDescription>
            Import transactions programmatically via the REST API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge>POST</Badge>
              <code className="text-sm">/api/finances/import</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Requires authentication via session cookie. All requests must include a valid session.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Request Body</Label>
            <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
{`{
  "accountId": "your-account-id",
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "Grocery Store",
      "amount": 52.43,
      "type": "expense",
      "merchant": "Whole Foods"
    },
    {
      "date": "2024-01-14",
      "description": "Paycheck",
      "amount": 3500.00,
      "type": "income"
    }
  ]
}`}
            </pre>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Fields</Label>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><code className="text-xs bg-muted px-1 py-0.5 rounded">date</code> (required) — Transaction date in YYYY-MM-DD format</p>
              <p><code className="text-xs bg-muted px-1 py-0.5 rounded">description</code> (required) — Transaction description</p>
              <p><code className="text-xs bg-muted px-1 py-0.5 rounded">amount</code> (required) — Amount in dollars (positive number)</p>
              <p><code className="text-xs bg-muted px-1 py-0.5 rounded">type</code> (required) — Either {`"income"`} or {`"expense"`}</p>
              <p><code className="text-xs bg-muted px-1 py-0.5 rounded">merchant</code> (optional) — Merchant or payee name</p>
              <p><code className="text-xs bg-muted px-1 py-0.5 rounded">categoryId</code> (optional) — Category ID for the transaction</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Response</Label>
            <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
{`{
  "imported": 2,
  "skipped": 0
}`}
            </pre>
            <p className="text-sm text-muted-foreground">
              Duplicate transactions (same account, date, description, and amount) are automatically
              skipped.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Example</Label>
            <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
{`curl -X POST http://localhost:3000/api/finances/import \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session=YOUR_SESSION_TOKEN" \\
  -d '{
    "accountId": "your-account-id",
    "transactions": [
      {
        "date": "2024-01-15",
        "description": "Coffee Shop",
        "amount": 5.50,
        "type": "expense",
        "merchant": "Blue Bottle"
      }
    ]
  }'`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
