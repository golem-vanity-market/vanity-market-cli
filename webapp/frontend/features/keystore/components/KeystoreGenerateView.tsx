import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

interface KeystoreGenerateViewProps {
  onGenerate: (passphrase: string) => void;
  isLoading: boolean;
  isResetFlow: boolean;
}

export function KeystoreGenerateView({
  onGenerate,
  isLoading,
  isResetFlow,
}: KeystoreGenerateViewProps) {
  const [passphrase, setPassphrase] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onGenerate(passphrase);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isResetFlow && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Warning!</AlertTitle>
          <AlertDescription>
            This will overwrite your existing key. This action cannot be undone.
          </AlertDescription>
        </Alert>
      )}
      <div className="text-center">
        <h4 className="font-semibold">
          {isResetFlow ? "Generate New Key" : "Create Keystore"}
        </h4>
        <p className="text-sm text-muted-foreground">
          {isResetFlow
            ? "Please set a new, strong passphrase."
            : "No key was found. Create one to get started."}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="passphrase-generate">New Passphrase</Label>
        <Input
          id="passphrase-generate"
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          required
          minLength={12}
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="mr-2 h-4 w-4" />
        )}
        {isResetFlow ? "Reset and Generate" : "Generate Key"}
      </Button>
    </form>
  );
}
