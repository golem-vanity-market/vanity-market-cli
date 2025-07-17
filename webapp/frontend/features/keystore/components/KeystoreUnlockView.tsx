import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { KeyRound, Loader2 } from "lucide-react";

interface KeystoreUnlockViewProps {
  onUnlock: (passphrase: string) => void;
  onReset: () => void;
  isLoading: boolean;
}

export function KeystoreUnlockView({
  onUnlock,
  onReset,
  isLoading,
}: KeystoreUnlockViewProps) {
  const [passphrase, setPassphrase] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUnlock(passphrase);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center">
        <h4 className="font-semibold">Unlock Keystore</h4>
        <p className="text-sm text-muted-foreground">
          Enter your passphrase to access your key.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="passphrase-unlock">Passphrase</Label>
        <Input
          id="passphrase-unlock"
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="mr-2 h-4 w-4" />
        )}
        Unlock
      </Button>
      <Separator />
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Forgot your password?</p>
        <Button
          variant="link"
          type="button"
          className="h-auto p-0"
          onClick={onReset}
        >
          Reset and generate a new key
        </Button>
      </div>
    </form>
  );
}
