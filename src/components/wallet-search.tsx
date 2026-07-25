"use client";

import { Search, Wallet } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidWalletAddress } from "@/lib/format";

export function WalletSearch({
  onSearch,
}: {
  onSearch: (address: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = value.trim();
    if (!isValidWalletAddress(address)) {
      setError("Enter a valid 42-character EVM wallet address.");
      return;
    }
    setError("");
    onSearch(address);
  }

  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Wallet className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            aria-label="Wallet address"
            aria-invalid={Boolean(error)}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError("");
            }}
            placeholder="Enter a public EVM address (0x…)"
            className="h-12 border-white/8 bg-[#171426]/80 pr-4 pl-11 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-violet-400/50 focus-visible:ring-violet-400/15"
          />
        </div>
        <Button
          type="submit"
          className="h-12 rounded-xl bg-violet-600 px-6 text-white shadow-[0_10px_28px_rgba(0,0,0,.2)] hover:bg-violet-500"
        >
          <Search className="size-4" />
          Track positions
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-400">
          {error}
        </p>
      )}
    </form>
  );
}
