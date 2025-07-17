import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Info, Loader2 } from "lucide-react";
import { useKeystore } from "../hooks/useKeystore";

interface KeystoreDownloaderProps {
  salt: string;
  onSuccess?: () => void;
}

export function KeystoreDownloader({
  salt,
  onSuccess,
}: KeystoreDownloaderProps) {
  const { sendMessage } = useKeystore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [downloadPassword, setDownloadPassword] = useState("");

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    setIsLoading(true);

    try {
      await sendMessage("deriveAndDownload", {
        salt,
        passphrase,
        downloadPassword,
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleDownload} className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-semibold text-lg">Download Your Vanity Wallet</h4>
      <Alert className="max-w-md">
        <Info className="h-4 w-4" />
        <AlertDescription>
          You must provide your original keystore passphrase to authorize this,
          and set a new password for the downloadable file.
          <span className="font-bold">
            Please back up this password securely, as it cannot be changed or
            regenerated.
          </span>
        </AlertDescription>
      </Alert>
      <div className="space-y-2">
        <Label htmlFor="pass-original">Original Keystore Passphrase</Label>
        <Input
          id="pass-original"
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pass-download">New Download File Password</Label>
        <Input
          id="pass-download"
          type="password"
          value={downloadPassword}
          onChange={(e) => setDownloadPassword(e.target.value)}
          required
          minLength={12}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading || !salt}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Download Encrypted Key
      </Button>
      {error && (
        <p className="mt-2 text-sm font-medium text-destructive">{error}</p>
      )}
    </form>
  );
}
